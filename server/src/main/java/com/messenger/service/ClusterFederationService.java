package com.messenger.service;

import com.messenger.dto.ClusterFederationResponse;
import com.messenger.dto.CreateFederationRequest;
import com.messenger.dto.FederationClusterRequest;
import com.messenger.dto.FederationClusterResponse;
import com.messenger.model.ClusterFederation;
import com.messenger.model.FederationCluster;
import com.messenger.model.enums.ClusterStatus;
import com.messenger.model.enums.FederationStatus;
import com.messenger.repository.ClusterFederationRepository;
import com.messenger.repository.FederationClusterRepository;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ClusterFederationService {

    private final FederationClusterRepository federationClusterRepository;
    private final ClusterFederationRepository clusterFederationRepository;
    private final RestTemplate restTemplate;

    public ClusterFederationService(
            FederationClusterRepository federationClusterRepository,
            ClusterFederationRepository clusterFederationRepository,
            RestTemplateBuilder restTemplateBuilder) {
        this.federationClusterRepository = federationClusterRepository;
        this.clusterFederationRepository = clusterFederationRepository;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(4))
                .build();
    }

    @Transactional(readOnly = true)
    public List<FederationClusterResponse> getClusters() {
        return federationClusterRepository.findAll().stream()
                .map(this::toClusterResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FederationClusterResponse registerCluster(FederationClusterRequest request) {
        String normalizedName = request.getName().trim();
        String normalizedBaseUrl = normalizeApiBaseUrl(request.getApiBaseUrl());
        String normalizedHealthEndpoint = normalizeHealthEndpoint(request.getHealthEndpoint());

        federationClusterRepository.findByNameIgnoreCase(normalizedName)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Cluster with this name already exists.");
                });
        federationClusterRepository.findByApiBaseUrl(normalizedBaseUrl)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Cluster with this API URL already exists.");
                });

        FederationCluster cluster = new FederationCluster();
        cluster.setName(normalizedName);
        cluster.setApiBaseUrl(normalizedBaseUrl);
        cluster.setHealthEndpoint(normalizedHealthEndpoint);
        cluster.setStatus(ClusterStatus.UNKNOWN);

        refreshClusterStatus(cluster);
        FederationCluster saved = federationClusterRepository.save(cluster);
        return toClusterResponse(saved);
    }

    @Transactional
    public List<FederationClusterResponse> refreshClusterStatuses() {
        List<FederationCluster> clusters = federationClusterRepository.findAll();
        for (FederationCluster cluster : clusters) {
            refreshClusterStatus(cluster);
        }

        List<FederationCluster> saved = federationClusterRepository.saveAll(clusters);
        return saved.stream()
                .map(this::toClusterResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClusterFederationResponse> getFederations() {
        return clusterFederationRepository.findAll().stream()
                .map(this::toFederationResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ClusterFederationResponse createFederation(CreateFederationRequest request) {
        if (request.getClusterIds() == null || request.getClusterIds().size() < 2) {
            throw new IllegalArgumentException("At least two clusters are required to create a federation.");
        }

        String federationName = request.getName().trim();
        clusterFederationRepository.findByNameIgnoreCase(federationName)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Federation with this name already exists.");
                });

        List<FederationCluster> clusters = federationClusterRepository.findAllById(request.getClusterIds());
        if (clusters.size() != request.getClusterIds().size()) {
            throw new IllegalArgumentException("One or more selected clusters do not exist.");
        }

        ensureClustersAreRunning(clusters);

        ClusterFederation federation = new ClusterFederation();
        federation.setName(federationName);
        federation.setDescription(request.getDescription());
        federation.setStatus(FederationStatus.ACTIVE);
        federation.setClusters(new HashSet<>(clusters));

        ClusterFederation saved = clusterFederationRepository.save(federation);
        return toFederationResponse(saved);
    }

    private void ensureClustersAreRunning(List<FederationCluster> clusters) {
        for (FederationCluster cluster : clusters) {
            refreshClusterStatus(cluster);
        }
        federationClusterRepository.saveAll(clusters);

        List<String> notRunningClusters = clusters.stream()
                .filter(cluster -> cluster.getStatus() != ClusterStatus.RUNNING)
                .map(FederationCluster::getName)
                .collect(Collectors.toList());

        if (!notRunningClusters.isEmpty()) {
            throw new IllegalArgumentException(
                    "Federation can be created only from running clusters. Unavailable clusters: "
                            + String.join(", ", notRunningClusters));
        }
    }

    private void refreshClusterStatus(FederationCluster cluster) {
        String healthUrl = buildHealthUrl(cluster.getApiBaseUrl(), cluster.getHealthEndpoint());
        cluster.setLastCheckedAt(LocalDateTime.now());

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(healthUrl, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                cluster.setStatus(ClusterStatus.RUNNING);
                cluster.setLastError(null);
            } else {
                cluster.setStatus(ClusterStatus.UNREACHABLE);
                cluster.setLastError("Health endpoint returned status " + response.getStatusCode().value());
            }
        } catch (Exception ex) {
            cluster.setStatus(ClusterStatus.UNREACHABLE);
            cluster.setLastError(trimErrorMessage(ex.getMessage()));
        }
    }

    private String trimErrorMessage(String message) {
        if (message == null || message.isBlank()) {
            return "Health check request failed.";
        }

        if (message.length() > 220) {
            return message.substring(0, 220);
        }
        return message;
    }

    private String normalizeApiBaseUrl(String rawUrl) {
        String normalized = rawUrl.trim();
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        try {
            URI uri = URI.create(normalized);
            if (uri.getScheme() == null || uri.getHost() == null) {
                throw new IllegalArgumentException("Cluster API base URL must include scheme and host.");
            }
            return normalized;
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Cluster API base URL is invalid.");
        }
    }

    private String normalizeHealthEndpoint(String healthEndpoint) {
        if (healthEndpoint == null || healthEndpoint.isBlank()) {
            return "/actuator/health";
        }
        String normalized = healthEndpoint.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        return normalized;
    }

    private String buildHealthUrl(String apiBaseUrl, String healthEndpoint) {
        String endpoint = normalizeHealthEndpoint(healthEndpoint);
        return apiBaseUrl + endpoint;
    }

    private FederationClusterResponse toClusterResponse(FederationCluster cluster) {
        FederationClusterResponse response = new FederationClusterResponse();
        response.setId(cluster.getId());
        response.setName(cluster.getName());
        response.setApiBaseUrl(cluster.getApiBaseUrl());
        response.setHealthEndpoint(cluster.getHealthEndpoint());
        response.setStatus(cluster.getStatus() != null ? cluster.getStatus().name() : ClusterStatus.UNKNOWN.name());
        response.setLastCheckedAt(cluster.getLastCheckedAt());
        response.setLastError(cluster.getLastError());
        return response;
    }

    private ClusterFederationResponse toFederationResponse(ClusterFederation federation) {
        ClusterFederationResponse response = new ClusterFederationResponse();
        response.setId(federation.getId());
        response.setName(federation.getName());
        response.setDescription(federation.getDescription());
        response.setStatus(federation.getStatus() != null ? federation.getStatus().name() : FederationStatus.INACTIVE.name());
        response.setCreatedAt(federation.getCreatedAt());
        response.setUpdatedAt(federation.getUpdatedAt());

        Set<FederationCluster> clusters = federation.getClusters() != null ? federation.getClusters() : Set.of();
        response.setClusters(clusters.stream()
                .map(this::toClusterResponse)
                .collect(Collectors.toList()));
        return response;
    }
}

package com.messenger.controller;

import com.messenger.dto.ClusterFederationResponse;
import com.messenger.dto.CreateFederationRequest;
import com.messenger.dto.FederationClusterRequest;
import com.messenger.dto.FederationClusterResponse;
import com.messenger.service.ClusterFederationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/federation")
public class ClusterFederationController {

    private final ClusterFederationService clusterFederationService;

    public ClusterFederationController(ClusterFederationService clusterFederationService) {
        this.clusterFederationService = clusterFederationService;
    }

    @GetMapping("/clusters")
    public ResponseEntity<List<FederationClusterResponse>> getClusters() {
        return ResponseEntity.ok(clusterFederationService.getClusters());
    }

    @PostMapping("/clusters")
    public ResponseEntity<?> registerCluster(@Valid @RequestBody FederationClusterRequest request) {
        try {
            return ResponseEntity.ok(clusterFederationService.registerCluster(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/clusters/refresh")
    public ResponseEntity<List<FederationClusterResponse>> refreshClusters() {
        return ResponseEntity.ok(clusterFederationService.refreshClusterStatuses());
    }

    @GetMapping("/federations")
    public ResponseEntity<List<ClusterFederationResponse>> getFederations() {
        return ResponseEntity.ok(clusterFederationService.getFederations());
    }

    @PostMapping("/federations")
    public ResponseEntity<?> createFederation(@Valid @RequestBody CreateFederationRequest request) {
        try {
            ClusterFederationResponse federation = clusterFederationService.createFederation(request);
            return ResponseEntity.ok(federation);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}

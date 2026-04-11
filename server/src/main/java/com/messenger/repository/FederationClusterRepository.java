package com.messenger.repository;

import com.messenger.model.FederationCluster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FederationClusterRepository extends JpaRepository<FederationCluster, Long> {
    Optional<FederationCluster> findByNameIgnoreCase(String name);

    Optional<FederationCluster> findByApiBaseUrl(String apiBaseUrl);
}

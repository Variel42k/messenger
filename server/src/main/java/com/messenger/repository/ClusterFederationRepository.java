package com.messenger.repository;

import com.messenger.model.ClusterFederation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClusterFederationRepository extends JpaRepository<ClusterFederation, Long> {
    Optional<ClusterFederation> findByNameIgnoreCase(String name);
}

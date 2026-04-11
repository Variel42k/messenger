package com.messenger.repository;

import com.messenger.model.OidcProviderConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OidcProviderConfigRepository extends JpaRepository<OidcProviderConfig, Long> {
    Optional<OidcProviderConfig> findFirstByOrderByIdAsc();
}

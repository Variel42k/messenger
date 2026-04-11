package com.messenger.service;

import com.messenger.dto.OidcProviderPublicResponse;
import com.messenger.dto.OidcProviderSettingsRequest;
import com.messenger.dto.OidcProviderSettingsResponse;
import com.messenger.model.OidcProviderConfig;
import com.messenger.model.enums.UserRole;
import com.messenger.repository.OidcProviderConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OidcProviderService {

    private static final String DEFAULT_PROVIDER_KEY = "default";
    private static final String DEFAULT_DISPLAY_NAME = "Enterprise SSO";
    private static final String DEFAULT_SCOPES = "openid profile email";

    private final OidcProviderConfigRepository oidcProviderConfigRepository;

    public OidcProviderService(OidcProviderConfigRepository oidcProviderConfigRepository) {
        this.oidcProviderConfigRepository = oidcProviderConfigRepository;
    }

    @Transactional(readOnly = true)
    public OidcProviderSettingsResponse getAdminSettings() {
        return toSettingsResponse(getOrCreateProviderConfig());
    }

    @Transactional(readOnly = true)
    public OidcProviderPublicResponse getPublicSettings() {
        OidcProviderConfig provider = getOrCreateProviderConfig();
        return new OidcProviderPublicResponse(provider.isEnabled(), provider.getDisplayName());
    }

    @Transactional
    public OidcProviderSettingsResponse saveSettings(OidcProviderSettingsRequest request) {
        OidcProviderConfig provider = getOrCreateProviderConfig();
        applyRequest(provider, request);
        validateIfEnabled(provider);
        OidcProviderConfig saved = oidcProviderConfigRepository.save(provider);
        return toSettingsResponse(saved);
    }

    @Transactional(readOnly = true)
    public OidcProviderConfig requireEnabledProvider() {
        OidcProviderConfig provider = getOrCreateProviderConfig();
        if (!provider.isEnabled()) {
            throw new IllegalStateException("OIDC authentication is disabled. Configure and enable a provider first.");
        }
        validateIfEnabled(provider);
        return provider;
    }

    private OidcProviderConfig getOrCreateProviderConfig() {
        return oidcProviderConfigRepository.findFirstByOrderByIdAsc()
                .orElseGet(this::createDefaultProviderConfig);
    }

    private OidcProviderConfig createDefaultProviderConfig() {
        OidcProviderConfig provider = new OidcProviderConfig();
        provider.setProviderName(DEFAULT_PROVIDER_KEY);
        provider.setDisplayName(DEFAULT_DISPLAY_NAME);
        provider.setScopes(DEFAULT_SCOPES);
        provider.setDefaultRole(UserRole.USER);
        provider.setAutoProvisionUsers(true);
        provider.setEnabled(false);
        return provider;
    }

    private void applyRequest(OidcProviderConfig provider, OidcProviderSettingsRequest request) {
        provider.setProviderName(defaultIfBlank(request.getProviderName(), DEFAULT_PROVIDER_KEY));
        provider.setDisplayName(defaultIfBlank(request.getDisplayName(), DEFAULT_DISPLAY_NAME));
        provider.setEnabled(request.isEnabled());
        provider.setIssuerUri(trimToNull(request.getIssuerUri()));
        provider.setAuthorizationUri(trimToNull(request.getAuthorizationUri()));
        provider.setTokenUri(trimToNull(request.getTokenUri()));
        provider.setUserInfoUri(trimToNull(request.getUserInfoUri()));
        provider.setJwksUri(trimToNull(request.getJwksUri()));
        provider.setClientId(trimToNull(request.getClientId()));

        if (request.getClientSecret() != null && !request.getClientSecret().isBlank()) {
            provider.setClientSecret(request.getClientSecret().trim());
        }

        provider.setScopes(defaultIfBlank(normalizeScopes(request.getScopes()), DEFAULT_SCOPES));
        provider.setRedirectUri(trimToNull(request.getRedirectUri()));
        provider.setAutoProvisionUsers(request.isAutoProvisionUsers());
        provider.setDefaultRole(resolveRole(request.getDefaultRole()));
    }

    private void validateIfEnabled(OidcProviderConfig provider) {
        if (!provider.isEnabled()) {
            return;
        }

        requireValue(provider.getAuthorizationUri(), "authorizationUri");
        requireValue(provider.getTokenUri(), "tokenUri");
        requireValue(provider.getUserInfoUri(), "userInfoUri");
        requireValue(provider.getClientId(), "clientId");
        requireValue(provider.getClientSecret(), "clientSecret");
        requireValue(provider.getRedirectUri(), "redirectUri");
        requireValue(provider.getScopes(), "scopes");
    }

    private void requireValue(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("OIDC provider field '" + fieldName + "' is required when provider is enabled.");
        }
    }

    private String normalizeScopes(String scopes) {
        if (scopes == null) {
            return null;
        }
        return scopes.trim().replaceAll("\\s+", " ");
    }

    private UserRole resolveRole(String roleRaw) {
        if (roleRaw == null || roleRaw.isBlank()) {
            return UserRole.USER;
        }

        try {
            return UserRole.valueOf(roleRaw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return UserRole.USER;
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private OidcProviderSettingsResponse toSettingsResponse(OidcProviderConfig provider) {
        OidcProviderSettingsResponse response = new OidcProviderSettingsResponse();
        response.setProviderName(provider.getProviderName());
        response.setDisplayName(provider.getDisplayName());
        response.setEnabled(provider.isEnabled());
        response.setIssuerUri(provider.getIssuerUri());
        response.setAuthorizationUri(provider.getAuthorizationUri());
        response.setTokenUri(provider.getTokenUri());
        response.setUserInfoUri(provider.getUserInfoUri());
        response.setJwksUri(provider.getJwksUri());
        response.setClientId(provider.getClientId());
        response.setScopes(provider.getScopes());
        response.setRedirectUri(provider.getRedirectUri());
        response.setAutoProvisionUsers(provider.isAutoProvisionUsers());
        response.setDefaultRole(provider.getDefaultRole() != null ? provider.getDefaultRole().name() : UserRole.USER.name());
        response.setClientSecretConfigured(provider.getClientSecret() != null && !provider.getClientSecret().isBlank());
        return response;
    }
}

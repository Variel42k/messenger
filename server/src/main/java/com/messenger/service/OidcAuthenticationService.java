package com.messenger.service;

import com.messenger.dto.AuthResponse;
import com.messenger.dto.OidcCodeExchangeRequest;
import com.messenger.model.OidcProviderConfig;
import com.messenger.model.User;
import com.messenger.model.enums.UserRole;
import com.messenger.model.enums.UserStatus;
import com.messenger.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class OidcAuthenticationService {

    private static final Logger logger = LoggerFactory.getLogger(OidcAuthenticationService.class);
    private static final String FALLBACK_EMAIL_DOMAIN = "oidc.local";

    private final OidcProviderService oidcProviderService;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RestTemplate restTemplate;

    private final ConcurrentMap<String, OidcStateEntry> oidcLoginStates = new ConcurrentHashMap<>();

    @Value("${app.oidc.state-ttl-seconds:600}")
    private long stateTtlSeconds;

    public OidcAuthenticationService(
            OidcProviderService oidcProviderService,
            UserService userService,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            RestTemplateBuilder restTemplateBuilder) {
        this.oidcProviderService = oidcProviderService;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(8))
                .build();
    }

    public String buildAuthorizationUrl(String redirectUri) {
        OidcProviderConfig provider = oidcProviderService.requireEnabledProvider();
        removeExpiredStates();

        String effectiveRedirectUri = resolveRedirectUri(provider, redirectUri);
        String state = UUID.randomUUID().toString();
        oidcLoginStates.put(state, new OidcStateEntry(Instant.now().plusSeconds(stateTtlSeconds), effectiveRedirectUri));

        return UriComponentsBuilder.fromUriString(provider.getAuthorizationUri())
                .queryParam("response_type", "code")
                .queryParam("client_id", provider.getClientId())
                .queryParam("redirect_uri", effectiveRedirectUri)
                .queryParam("scope", provider.getScopes())
                .queryParam("state", state)
                .build(true)
                .toUriString();
    }

    @Transactional
    public AuthResponse exchangeCodeForTokens(OidcCodeExchangeRequest request) {
        removeExpiredStates();

        OidcStateEntry stateEntry = oidcLoginStates.remove(request.getState());
        if (stateEntry == null || stateEntry.expiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("OIDC state is invalid or has expired.");
        }

        OidcProviderConfig provider = oidcProviderService.requireEnabledProvider();
        String effectiveRedirectUri = resolveRedirectUri(provider, request.getRedirectUri());
        if (!stateEntry.redirectUri().equals(effectiveRedirectUri)) {
            throw new IllegalArgumentException("OIDC redirect URI mismatch.");
        }

        Map<String, Object> tokenPayload = exchangeAuthorizationCode(
                provider,
                request.getCode(),
                effectiveRedirectUri);

        String oidcAccessToken = asString(tokenPayload.get("access_token"));
        if (oidcAccessToken == null || oidcAccessToken.isBlank()) {
            throw new IllegalStateException("OIDC token response does not contain an access_token.");
        }

        Map<String, Object> userInfo = loadUserInfo(provider, oidcAccessToken);
        User localUser = resolveOrCreateLocalUser(provider, userInfo);

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                localUser.getUsername(),
                null);

        String accessToken = jwtTokenProvider.generateAccessToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);
        return AuthResponse.authenticated(
                accessToken,
                refreshToken,
                "Bearer",
                localUser.getUsername(),
                localUser.getRole().name());
    }

    private Map<String, Object> exchangeAuthorizationCode(
            OidcProviderConfig provider,
            String code,
            String redirectUri) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", redirectUri);
        body.add("client_id", provider.getClientId());
        body.add("client_secret", provider.getClientSecret());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                provider.getTokenUri(),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                new ParameterizedTypeReference<>() {
                });

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException("OIDC provider returned an invalid token response.");
        }

        return response.getBody();
    }

    private Map<String, Object> loadUserInfo(OidcProviderConfig provider, String oidcAccessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(oidcAccessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                provider.getUserInfoUri(),
                HttpMethod.GET,
                new HttpEntity<>(headers),
                new ParameterizedTypeReference<>() {
                });

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException("OIDC provider returned an invalid userinfo response.");
        }

        return response.getBody();
    }

    private User resolveOrCreateLocalUser(OidcProviderConfig provider, Map<String, Object> userInfo) {
        String usernameCandidate = buildUsernameCandidate(userInfo);
        String emailCandidate = buildEmailCandidate(userInfo, usernameCandidate);

        User existingByEmail = userService.findByEmail(emailCandidate);
        if (existingByEmail != null) {
            return ensureActive(existingByEmail, emailCandidate);
        }

        User existingByUsername = userService.findByUsername(usernameCandidate);
        if (existingByUsername != null) {
            return ensureActive(existingByUsername, emailCandidate);
        }

        if (!provider.isAutoProvisionUsers()) {
            throw new IllegalStateException("OIDC user does not exist locally and auto-provisioning is disabled.");
        }

        String uniqueUsername = makeUniqueUsername(usernameCandidate);
        String uniqueEmail = makeUniqueEmail(emailCandidate, uniqueUsername);

        User newUser = new User();
        newUser.setUsername(uniqueUsername);
        newUser.setEmail(uniqueEmail);
        newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        newUser.setRole(provider.getDefaultRole() != null ? provider.getDefaultRole() : UserRole.USER);
        newUser.setStatus(UserStatus.ACTIVE);
        newUser.setTwoFactorEnabled(false);
        newUser.setTwoFactorSecret(null);

        logger.info("Provisioning local account '{}' from OIDC user info", uniqueUsername);
        return userService.save(newUser);
    }

    private User ensureActive(User user, String fallbackEmail) {
        boolean changed = false;

        if (user.getStatus() != UserStatus.ACTIVE) {
            user.setStatus(UserStatus.ACTIVE);
            changed = true;
        }

        if ((user.getEmail() == null || user.getEmail().isBlank()) && fallbackEmail != null) {
            user.setEmail(makeUniqueEmail(fallbackEmail, user.getUsername()));
            changed = true;
        }

        return changed ? userService.save(user) : user;
    }

    private String buildUsernameCandidate(Map<String, Object> userInfo) {
        List<String> candidates = new ArrayList<>();
        candidates.add(asString(userInfo.get("preferred_username")));
        candidates.add(asString(userInfo.get("nickname")));
        candidates.add(asString(userInfo.get("name")));
        candidates.add(asString(userInfo.get("email")));
        candidates.add(asString(userInfo.get("sub")));

        for (String candidate : candidates) {
            String normalized = normalizeUsername(candidate);
            if (!normalized.isBlank()) {
                return normalized;
            }
        }

        return "oidc-user";
    }

    private String buildEmailCandidate(Map<String, Object> userInfo, String usernameCandidate) {
        String email = asString(userInfo.get("email"));
        if (email != null && email.contains("@")) {
            return email.trim().toLowerCase(Locale.ROOT);
        }

        String upn = asString(userInfo.get("upn"));
        if (upn != null && upn.contains("@")) {
            return upn.trim().toLowerCase(Locale.ROOT);
        }

        return usernameCandidate + "@" + FALLBACK_EMAIL_DOMAIN;
    }

    private String makeUniqueUsername(String requested) {
        String base = normalizeUsername(requested);
        if (base.isBlank()) {
            base = "oidc-user";
        }

        String candidate = base;
        int sequence = 1;
        while (userService.existsByUsername(candidate)) {
            candidate = base + "-" + sequence++;
        }

        return candidate;
    }

    private String makeUniqueEmail(String requested, String fallbackUsername) {
        String normalizedEmail = requested != null ? requested.trim().toLowerCase(Locale.ROOT) : "";
        if (!normalizedEmail.contains("@")) {
            normalizedEmail = fallbackUsername + "@" + FALLBACK_EMAIL_DOMAIN;
        }

        String localPart = normalizedEmail.substring(0, normalizedEmail.indexOf('@'));
        String domainPart = normalizedEmail.substring(normalizedEmail.indexOf('@') + 1);

        String candidate = localPart + "@" + domainPart;
        int sequence = 1;
        while (userService.existsByEmail(candidate)) {
            candidate = localPart + "+" + sequence++ + "@" + domainPart;
        }

        return candidate;
    }

    private String normalizeUsername(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]+", "-")
                .replaceAll("(^-+|-+$)", "");

        if (normalized.contains("@")) {
            normalized = normalized.substring(0, normalized.indexOf('@'));
        }

        return normalized;
    }

    private String resolveRedirectUri(OidcProviderConfig provider, String redirectUri) {
        String effectiveRedirectUri = redirectUri;
        if (effectiveRedirectUri == null || effectiveRedirectUri.isBlank()) {
            effectiveRedirectUri = provider.getRedirectUri();
        }
        if (effectiveRedirectUri == null || effectiveRedirectUri.isBlank()) {
            throw new IllegalArgumentException("OIDC redirect URI is not configured.");
        }

        try {
            URI.create(effectiveRedirectUri);
        } catch (Exception ex) {
            throw new IllegalArgumentException("OIDC redirect URI is invalid.");
        }

        return effectiveRedirectUri;
    }

    private void removeExpiredStates() {
        Instant now = Instant.now();
        oidcLoginStates.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private record OidcStateEntry(Instant expiresAt, String redirectUri) {
    }
}

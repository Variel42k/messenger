package com.messenger.controller;

import com.messenger.dto.AuthResponse;
import com.messenger.dto.OidcAuthorizationUrlResponse;
import com.messenger.dto.OidcCodeExchangeRequest;
import com.messenger.dto.OidcProviderPublicResponse;
import com.messenger.service.OidcAuthenticationService;
import com.messenger.service.OidcProviderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/oidc")
public class OidcAuthController {

    private final OidcProviderService oidcProviderService;
    private final OidcAuthenticationService oidcAuthenticationService;

    public OidcAuthController(
            OidcProviderService oidcProviderService,
            OidcAuthenticationService oidcAuthenticationService) {
        this.oidcProviderService = oidcProviderService;
        this.oidcAuthenticationService = oidcAuthenticationService;
    }

    @GetMapping("/provider")
    public ResponseEntity<OidcProviderPublicResponse> getPublicProviderSettings() {
        return ResponseEntity.ok(oidcProviderService.getPublicSettings());
    }

    @GetMapping("/authorization-url")
    public ResponseEntity<?> getAuthorizationUrl(@RequestParam(required = false) String redirectUri) {
        try {
            String authorizationUrl = oidcAuthenticationService.buildAuthorizationUrl(redirectUri);
            return ResponseEntity.ok(new OidcAuthorizationUrlResponse(authorizationUrl));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/exchange")
    public ResponseEntity<?> exchangeAuthorizationCode(@Valid @RequestBody OidcCodeExchangeRequest request) {
        try {
            AuthResponse authResponse = oidcAuthenticationService.exchangeCodeForTokens(request);
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        }
    }
}

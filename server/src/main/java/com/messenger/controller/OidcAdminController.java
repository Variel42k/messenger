package com.messenger.controller;

import com.messenger.dto.OidcProviderSettingsRequest;
import com.messenger.dto.OidcProviderSettingsResponse;
import com.messenger.service.OidcProviderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/oidc")
public class OidcAdminController {

    private final OidcProviderService oidcProviderService;

    public OidcAdminController(OidcProviderService oidcProviderService) {
        this.oidcProviderService = oidcProviderService;
    }

    @GetMapping("/provider")
    public ResponseEntity<OidcProviderSettingsResponse> getProviderSettings() {
        return ResponseEntity.ok(oidcProviderService.getAdminSettings());
    }

    @PutMapping("/provider")
    public ResponseEntity<?> saveProviderSettings(@RequestBody OidcProviderSettingsRequest request) {
        try {
            OidcProviderSettingsResponse response = oidcProviderService.saveSettings(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}

package com.messenger.controller;

import com.messenger.dto.LdapSettingsDto;
import com.messenger.service.LdapService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@ConditionalOnProperty(prefix = "app.ldap", name = "enabled", havingValue = "true")
public class LdapSettingsController {

    private final LdapService ldapService;

    public LdapSettingsController(LdapService ldapService) {
        this.ldapService = ldapService;
    }

    @PostMapping("/ldap-settings")
    public ResponseEntity<?> saveLdapSettings(@RequestBody LdapSettingsDto settings) {
        try {
            ldapService.saveLdapSettings(settings);
            return ResponseEntity.ok().body("{\"message\": \"LDAP settings saved successfully\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/ldap-settings")
    public ResponseEntity<LdapSettingsDto> getLdapSettings() {
        try {
            LdapSettingsDto settings = ldapService.getCurrentLdapSettings();
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/ldap-test-connection")
    public ResponseEntity<?> testLdapConnection() {
        try {
            boolean connected = ldapService.testConnection();
            if (connected) {
                return ResponseEntity.ok().body("{\"success\": true, \"message\": \"LDAP connection successful\"}");
            } else {
                return ResponseEntity.badRequest().body("{\"success\": false, \"message\": \"Failed to connect to LDAP server\"}");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"success\": false, \"message\": \"" + e.getMessage() + "\"}");
        }
    }

    /**
     * Возвращает справочную информацию по настройке LDAP для различных типов доменов
     * Provides help information for configuring LDAP with different domain types
     */
    @GetMapping("/ldap-configuration-help")
    public ResponseEntity<Map<String, Object>> getLdapConfigurationHelp() {
        Map<String, Object> helpInfo = new HashMap<>();

        // Информация о настройке домена Windows
        Map<String, Object> windowsConfig = new HashMap<>();
        windowsConfig.put("description", "How to configure LDAP authentication with a Windows domain controller:");
        windowsConfig.put("steps", Arrays.asList(
            "Open Active Directory Users and Computers",
            "Navigate to the Organizational Unit (OU) containing users",
            "Identify the Base DN (e.g., DC=company,DC=com)",
            "Create a service account with read permissions to user data",
            "Use LDAPS (ldaps://) for secure connections",
            "Common user DN pattern: CN={0},OU=Users,DC=company,DC=com"
        ));

        // Информация о настройке домена Linux
        Map<String, Object> linuxConfig = new HashMap<>();
        linuxConfig.put("description", "How to configure LDAP authentication with a Linux OpenLDAP server:");
        linuxConfig.put("steps", Arrays.asList(
            "Install and configure OpenLDAP server",
            "Set up directory structure and base DN",
            "Create bind user with appropriate permissions",
            "Configure SSL/TLS if required",
            "Common user DN pattern: uid={0},ou=people,dc=example,dc=com"
        ));

        // Общие URL-адреса LDAP
        Map<String, String> commonUrls = new HashMap<>();
        commonUrls.put("windowsLdapUrl", "ldap://domain-controller.company.com:389 or ldaps://domain-controller.company.com:636");
        commonUrls.put("openLdapUrl", "ldap://ldap.example.com:389 or ldaps://ldap.example.com:636");

        helpInfo.put("windowsDomainConfiguration", windowsConfig);
        helpInfo.put("linuxDomainConfiguration", linuxConfig);
        helpInfo.put("commonLdapUrls", commonUrls);

        return ResponseEntity.ok(helpInfo);
    }
}
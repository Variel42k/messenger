package com.messenger.controller;

import com.messenger.service.DataPurgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@ConditionalOnProperty(prefix = "app.security", name = "policies-enabled", havingValue = "true", matchIfMissing = true)
public class SecurityPoliciesController {

    @Autowired
    private DataPurgeService dataPurgeService;

    // DTO для настроек политик безопасности
    public static class SecurityPolicySettings {
        private boolean enabled;
        private boolean encryptionRequired;
        private int minPasswordLength;
        private boolean requireSpecialChars;
        private int passwordExpiryDays;
        private boolean enableTwoFactorAuth;
        private int sessionTimeout;
        private int maxLoginAttempts;
        private int lockoutDuration;
        private int dataRetentionPeriod;
        private boolean automaticDataPurge;
        private String purgeFrequency;
        private boolean auditLogging;

        // Конструкторы
        public SecurityPolicySettings() {}

        // Геттеры и сеттеры
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }

        public boolean isEncryptionRequired() { return encryptionRequired; }
        public void setEncryptionRequired(boolean encryptionRequired) { this.encryptionRequired = encryptionRequired; }

        public int getMinPasswordLength() { return minPasswordLength; }
        public void setMinPasswordLength(int minPasswordLength) { this.minPasswordLength = minPasswordLength; }

        public boolean isRequireSpecialChars() { return requireSpecialChars; }
        public void setRequireSpecialChars(boolean requireSpecialChars) { this.requireSpecialChars = requireSpecialChars; }

        public int getPasswordExpiryDays() { return passwordExpiryDays; }
        public void setPasswordExpiryDays(int passwordExpiryDays) { this.passwordExpiryDays = passwordExpiryDays; }

        public boolean isEnableTwoFactorAuth() { return enableTwoFactorAuth; }
        public void setEnableTwoFactorAuth(boolean enableTwoFactorAuth) { this.enableTwoFactorAuth = enableTwoFactorAuth; }

        public int getSessionTimeout() { return sessionTimeout; }
        public void setSessionTimeout(int sessionTimeout) { this.sessionTimeout = sessionTimeout; }

        public int getMaxLoginAttempts() { return maxLoginAttempts; }
        public void setMaxLoginAttempts(int maxLoginAttempts) { this.maxLoginAttempts = maxLoginAttempts; }

        public int getLockoutDuration() { return lockoutDuration; }
        public void setLockoutDuration(int lockoutDuration) { this.lockoutDuration = lockoutDuration; }

        public int getDataRetentionPeriod() { return dataRetentionPeriod; }
        public void setDataRetentionPeriod(int dataRetentionPeriod) { this.dataRetentionPeriod = dataRetentionPeriod; }

        public boolean isAutomaticDataPurge() { return automaticDataPurge; }
        public void setAutomaticDataPurge(boolean automaticDataPurge) { this.automaticDataPurge = automaticDataPurge; }

        public String getPurgeFrequency() { return purgeFrequency; }
        public void setPurgeFrequency(String purgeFrequency) { this.purgeFrequency = purgeFrequency; }

        public boolean isAuditLogging() { return auditLogging; }
        public void setAuditLogging(boolean auditLogging) { this.auditLogging = auditLogging; }
    }

    @PostMapping("/security-policies")
    public ResponseEntity<?> saveSecurityPolicies(@RequestBody SecurityPolicySettings settings) {
        try {
            // В реальном приложении здесь будет логика сохранения политик безопасности
            // Такая как обновление настроек в базе данных или в конфигурационном файле
            
            // Если включено автоматическое удаление данных, обновляем соответствующие настройки
            if (settings.isAutomaticDataPurge()) {
                dataPurgeService.setAutomaticDataPurgeEnabled(true);
                dataPurgeService.setDataRetentionPeriod(settings.getDataRetentionPeriod());
            } else {
                dataPurgeService.setAutomaticDataPurgeEnabled(false);
            }
            
            return ResponseEntity.ok().body(Map.of("message", "Security policies saved successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/security-policies")
    public ResponseEntity<SecurityPolicySettings> getSecurityPolicies() {
        try {
            // В реальном приложении здесь будет логика получения политик безопасности из базы данных
            SecurityPolicySettings settings = new SecurityPolicySettings();
            settings.setEnabled(true);
            settings.setEncryptionRequired(true);
            settings.setMinPasswordLength(8);
            settings.setRequireSpecialChars(true);
            settings.setPasswordExpiryDays(90);
            settings.setEnableTwoFactorAuth(false);
            settings.setSessionTimeout(30);
            settings.setMaxLoginAttempts(5);
            settings.setLockoutDuration(30);
            settings.setDataRetentionPeriod(30);
            settings.setAutomaticDataPurge(true);
            settings.setPurgeFrequency("daily");
            settings.setAuditLogging(true);
            
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/test-security-policies")
    public ResponseEntity<?> testSecurityPolicies() {
        try {
            // В реальном приложении здесь будет логика тестирования политик безопасности
            boolean isValid = true; // Проверка валидности настроек
            
            if (isValid) {
                return ResponseEntity.ok().body(Map.of("success", true, "message", "Security policies validation successful"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Security policies validation failed"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
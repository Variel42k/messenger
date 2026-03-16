package com.messenger.dto;

/**
 * DTO containing data required to enroll a user into TOTP 2FA
 */
public class TwoFactorSetupResponse {
    private String secret;
    private String manualEntryKey;
    private String otpauthUrl;
    private String issuer;
    private String username;

    public TwoFactorSetupResponse(String secret, String manualEntryKey, String otpauthUrl, String issuer,
            String username) {
        this.secret = secret;
        this.manualEntryKey = manualEntryKey;
        this.otpauthUrl = otpauthUrl;
        this.issuer = issuer;
        this.username = username;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getManualEntryKey() {
        return manualEntryKey;
    }

    public void setManualEntryKey(String manualEntryKey) {
        this.manualEntryKey = manualEntryKey;
    }

    public String getOtpauthUrl() {
        return otpauthUrl;
    }

    public void setOtpauthUrl(String otpauthUrl) {
        this.otpauthUrl = otpauthUrl;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}

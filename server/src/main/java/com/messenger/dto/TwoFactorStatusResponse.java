package com.messenger.dto;

/**
 * DTO representing the current 2FA enrollment state of a user
 */
public class TwoFactorStatusResponse {
    private boolean enabled;
    private boolean pendingSetup;
    private String issuer;
    private String username;

    public TwoFactorStatusResponse(boolean enabled, boolean pendingSetup, String issuer, String username) {
        this.enabled = enabled;
        this.pendingSetup = pendingSetup;
        this.issuer = issuer;
        this.username = username;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isPendingSetup() {
        return pendingSetup;
    }

    public void setPendingSetup(boolean pendingSetup) {
        this.pendingSetup = pendingSetup;
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

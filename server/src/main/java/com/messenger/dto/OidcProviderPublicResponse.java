package com.messenger.dto;

public class OidcProviderPublicResponse {
    private boolean enabled;
    private String displayName;

    public OidcProviderPublicResponse() {
    }

    public OidcProviderPublicResponse(boolean enabled, String displayName) {
        this.enabled = enabled;
        this.displayName = displayName;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}

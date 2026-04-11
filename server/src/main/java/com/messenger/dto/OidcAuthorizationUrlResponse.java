package com.messenger.dto;

public class OidcAuthorizationUrlResponse {
    private String authorizationUrl;

    public OidcAuthorizationUrlResponse() {
    }

    public OidcAuthorizationUrlResponse(String authorizationUrl) {
        this.authorizationUrl = authorizationUrl;
    }

    public String getAuthorizationUrl() {
        return authorizationUrl;
    }

    public void setAuthorizationUrl(String authorizationUrl) {
        this.authorizationUrl = authorizationUrl;
    }
}

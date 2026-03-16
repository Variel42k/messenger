package com.messenger.dto;

/**
 * DTO for authentication response containing JWT tokens
 */
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private boolean requiresTwoFactor;
    private String twoFactorToken;
    private String username;
    private String role;

    public AuthResponse() {
    }

    public AuthResponse(String accessToken, String refreshToken, String tokenType) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public boolean isRequiresTwoFactor() {
        return requiresTwoFactor;
    }

    public void setRequiresTwoFactor(boolean requiresTwoFactor) {
        this.requiresTwoFactor = requiresTwoFactor;
    }

    public String getTwoFactorToken() {
        return twoFactorToken;
    }

    public void setTwoFactorToken(String twoFactorToken) {
        this.twoFactorToken = twoFactorToken;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public static AuthResponse authenticated(String accessToken, String refreshToken, String tokenType,
            String username, String role) {
        AuthResponse response = new AuthResponse(accessToken, refreshToken, tokenType);
        response.setUsername(username);
        response.setRole(role);
        response.setRequiresTwoFactor(false);
        return response;
    }

    public static AuthResponse twoFactorRequired(String twoFactorToken, String username, String role) {
        AuthResponse response = new AuthResponse();
        response.setTokenType("Bearer");
        response.setRequiresTwoFactor(true);
        response.setTwoFactorToken(twoFactorToken);
        response.setUsername(username);
        response.setRole(role);
        return response;
    }
}

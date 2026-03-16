package com.messenger.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for completing login with a second factor challenge
 */
public class TwoFactorLoginRequest {
    @NotBlank(message = "2FA challenge token is required")
    private String twoFactorToken;

    @NotBlank(message = "Authentication code is required")
    private String code;

    public String getTwoFactorToken() {
        return twoFactorToken;
    }

    public void setTwoFactorToken(String twoFactorToken) {
        this.twoFactorToken = twoFactorToken;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}

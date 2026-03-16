package com.messenger.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for enabling or disabling TOTP-based two-factor authentication
 */
public class TwoFactorCodeRequest {
    @NotBlank(message = "Authentication code is required")
    private String code;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}

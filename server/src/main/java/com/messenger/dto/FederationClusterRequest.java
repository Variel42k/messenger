package com.messenger.dto;

import jakarta.validation.constraints.NotBlank;

public class FederationClusterRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String apiBaseUrl;

    private String healthEndpoint;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    public String getHealthEndpoint() {
        return healthEndpoint;
    }

    public void setHealthEndpoint(String healthEndpoint) {
        this.healthEndpoint = healthEndpoint;
    }
}

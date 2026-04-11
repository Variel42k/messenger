package com.messenger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CreateFederationRequest {

    @NotBlank
    private String name;

    private String description;

    @Size(min = 2, message = "At least two clusters are required to create a federation")
    private List<Long> clusterIds;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Long> getClusterIds() {
        return clusterIds;
    }

    public void setClusterIds(List<Long> clusterIds) {
        this.clusterIds = clusterIds;
    }
}

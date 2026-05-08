package com.messenger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateChannelRequest {
    @NotBlank
    @Size(max = 100)
    private String name;

    @Size(max = 2000)
    private String description;

    private Boolean readonly;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getReadonly() { return readonly; }
    public void setReadonly(Boolean readonly) { this.readonly = readonly; }
}

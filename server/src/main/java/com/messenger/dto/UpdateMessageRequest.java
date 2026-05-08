package com.messenger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateMessageRequest {
    @NotBlank
    @Size(max = 20000)
    private String content;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}

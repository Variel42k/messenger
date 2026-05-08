package com.messenger.dto;

import com.messenger.model.enums.ChatRole;
import jakarta.validation.constraints.NotNull;

public class MemberRequest {
    @NotNull
    private Long userId;

    @NotNull
    private ChatRole role;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public ChatRole getRole() { return role; }
    public void setRole(ChatRole role) { this.role = role; }
}

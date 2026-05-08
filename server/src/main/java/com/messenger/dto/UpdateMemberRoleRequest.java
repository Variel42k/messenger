package com.messenger.dto;

import com.messenger.model.enums.ChatRole;
import jakarta.validation.constraints.NotNull;

public class UpdateMemberRoleRequest {
    @NotNull
    private ChatRole role;

    public ChatRole getRole() { return role; }
    public void setRole(ChatRole role) { this.role = role; }
}

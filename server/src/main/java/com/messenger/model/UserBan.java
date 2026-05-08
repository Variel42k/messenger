package com.messenger.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_bans")
public class UserBan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "scope_channel_id")
    private Long scopeChannelId;

    @Column(name = "banned_by")
    private Long bannedBy;

    private String reason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public UserBan() {
    }

    public UserBan(Long userId, Long scopeChannelId, Long bannedBy, String reason, LocalDateTime expiresAt) {
        this.userId = userId;
        this.scopeChannelId = scopeChannelId;
        this.bannedBy = bannedBy;
        this.reason = reason;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getScopeChannelId() { return scopeChannelId; }
    public void setScopeChannelId(Long scopeChannelId) { this.scopeChannelId = scopeChannelId; }

    public Long getBannedBy() { return bannedBy; }
    public void setBannedBy(Long bannedBy) { this.bannedBy = bannedBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }
}

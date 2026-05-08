package com.messenger.dto;

import java.time.LocalDateTime;

public class UserModerationRequest {
    private Long channelId;
    private String reason;
    private LocalDateTime expiresAt;

    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}

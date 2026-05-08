package com.messenger.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class RealtimeEvent {
    private String eventId;
    private String type;
    private Long channelId;
    private Long sequence;
    private Integer schemaVersion;
    private LocalDateTime occurredAt;
    private Map<String, Object> payload;

    public RealtimeEvent() {
    }

    public RealtimeEvent(String eventId, String type, Long channelId, Long sequence, Integer schemaVersion,
            LocalDateTime occurredAt, Map<String, Object> payload) {
        this.eventId = eventId;
        this.type = type;
        this.channelId = channelId;
        this.sequence = sequence;
        this.schemaVersion = schemaVersion;
        this.occurredAt = occurredAt;
        this.payload = payload;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }

    public Long getSequence() { return sequence; }
    public void setSequence(Long sequence) { this.sequence = sequence; }

    public Integer getSchemaVersion() { return schemaVersion; }
    public void setSchemaVersion(Integer schemaVersion) { this.schemaVersion = schemaVersion; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }

    public Map<String, Object> getPayload() { return payload; }
    public void setPayload(Map<String, Object> payload) { this.payload = payload; }
}

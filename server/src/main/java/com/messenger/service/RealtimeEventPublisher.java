package com.messenger.service;

import com.messenger.dto.RealtimeEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
public class RealtimeEventPublisher {
    private static final int SCHEMA_VERSION = 1;

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public RealtimeEvent publishToChannel(Long channelId, String type, Long sequence, Map<String, Object> payload) {
        RealtimeEvent event = new RealtimeEvent(
                UUID.randomUUID().toString(),
                type,
                channelId,
                sequence,
                SCHEMA_VERSION,
                LocalDateTime.now(),
                payload);
        messagingTemplate.convertAndSend("/topic/channels." + channelId, event);
        return event;
    }

    public RealtimeEvent publishToUser(Long userId, String type, Long sequence, Map<String, Object> payload) {
        RealtimeEvent event = new RealtimeEvent(
                UUID.randomUUID().toString(),
                type,
                null,
                sequence,
                SCHEMA_VERSION,
                LocalDateTime.now(),
                payload);
        messagingTemplate.convertAndSend("/topic/users." + userId, event);
        return event;
    }
}

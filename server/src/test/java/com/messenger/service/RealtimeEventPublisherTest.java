package com.messenger.service;

import com.messenger.dto.RealtimeEvent;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RealtimeEventPublisherTest {
    @Test
    void publishesVersionedChannelEnvelope() {
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        RealtimeEventPublisher publisher = new RealtimeEventPublisher(messagingTemplate);

        RealtimeEvent event = publisher.publishToChannel(42L, "message.created", 100L, Map.of("messageId", 100L));

        ArgumentCaptor<RealtimeEvent> eventCaptor = ArgumentCaptor.forClass(RealtimeEvent.class);
        verify(messagingTemplate).convertAndSend(org.mockito.ArgumentMatchers.eq("/topic/channels.42"), eventCaptor.capture());

        RealtimeEvent sentEvent = eventCaptor.getValue();
        assertEquals(event.getEventId(), sentEvent.getEventId());
        assertEquals("message.created", sentEvent.getType());
        assertEquals(42L, sentEvent.getChannelId());
        assertEquals(100L, sentEvent.getSequence());
        assertEquals(1, sentEvent.getSchemaVersion());
        assertEquals(100L, sentEvent.getPayload().get("messageId"));
        assertNotNull(sentEvent.getOccurredAt());
    }
}

package com.messenger.service;

import com.messenger.model.Chat;
import com.messenger.model.Message;
import com.messenger.model.enums.ChatType;
import com.messenger.repository.MessageFileRepository;
import com.messenger.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceIdempotencyTest {
    @Mock
    private MessageRepository messageRepository;

    @Mock
    private MessageFileRepository messageFileRepository;

    @Mock
    private ChatService chatService;

    @Mock
    private EncryptionService encryptionService;

    private MessageService messageService;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(messageRepository, messageFileRepository, chatService, encryptionService);
    }

    @Test
    void returnsExistingMessageForDuplicateClientMsgId() {
        Message existing = new Message();
        existing.setId(55L);
        existing.setClientMsgId("client-1");
        when(messageRepository.findByChat_IdAndSenderIdAndClientMsgId(10L, 20L, "client-1"))
                .thenReturn(Optional.of(existing));

        Message result = messageService.createMessage(10L, 20L, "hello", "client-1");

        assertEquals(55L, result.getId());
        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    void storesClientMsgIdForNewMessage() {
        Chat chat = new Chat("channel", ChatType.CHANNEL, 1L);
        chat.setId(10L);
        when(messageRepository.findByChat_IdAndSenderIdAndClientMsgId(10L, 20L, "client-2"))
                .thenReturn(Optional.empty());
        when(chatService.getChatById(10L)).thenReturn(Optional.of(chat));
        when(chatService.isUserMember(10L, 20L)).thenReturn(true);
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(99L);
            return message;
        });

        Message result = messageService.createMessage(10L, 20L, "hello", "client-2");

        assertEquals(99L, result.getId());
        assertEquals("client-2", result.getClientMsgId());
        assertNotNull(result.getCreatedAt());
    }
}

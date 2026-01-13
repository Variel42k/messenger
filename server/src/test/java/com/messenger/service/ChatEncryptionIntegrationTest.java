package com.messenger.service;

import com.messenger.model.Chat;
import com.messenger.model.Message;
import com.messenger.model.enums.ChatType;
import com.messenger.model.enums.ChatRole;
import com.messenger.repository.ChatRepository;
import com.messenger.repository.MessageRepository;
import com.messenger.repository.UserChatRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class ChatEncryptionIntegrationTest {

    @Mock
    private ChatRepository chatRepository;

    @Mock
    private UserChatRepository userChatRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private EncryptionService encryptionService;

    @InjectMocks
    private ChatService chatService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreateEncryptedChat() {
        // Подготовка данных
        String chatName = "Test Chat";
        ChatType chatType = ChatType.GROUP;
        Boolean encrypted = true;
        String encryptionKey = "test-key";
        String encryptionAlgorithm = "AES";
        String securityLevel = "SECURE";
        Long createdById = 1L;

        // Мокирование поведения
        Chat mockChat = new Chat(chatName, chatType, createdById);
        when(encryptionService.generateKey()).thenReturn("generated-key");
        when(chatRepository.save(any(Chat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Вызов тестируемого метода
        Chat result = chatService.createChat(chatName, chatType, encrypted, encryptionKey, encryptionAlgorithm, securityLevel, createdById);

        // Проверки
        assertNotNull(result);
        assertEquals(chatName, result.getName());
        assertEquals(chatType, result.getType());
        assertTrue(result.getEncrypted());
        assertEquals(encryptionAlgorithm, result.getEncryptionAlgorithm());
        assertEquals(securityLevel, result.getSecurityLevel());
        // Если ключ шифрования не предоставлен, сервис должен генерировать его
        assertEquals("generated-key", result.getEncryptionKey());
    }

    @Test
    void testCreateUnencryptedChat() {
        // Подготовка данных
        String chatName = "Test Chat";
        ChatType chatType = ChatType.GROUP;
        Boolean encrypted = false;
        String encryptionKey = null;
        String encryptionAlgorithm = "AES";
        String securityLevel = "SECURE";
        Long createdById = 1L;

        // Мокирование поведения
        Chat mockChat = new Chat(chatName, chatType, createdById);
        when(chatRepository.save(any(Chat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Вызов тестируемого метода
        Chat result = chatService.createChat(chatName, chatType, encrypted, encryptionKey, encryptionAlgorithm, securityLevel, createdById);

        // Проверки
        assertNotNull(result);
        assertEquals(chatName, result.getName());
        assertEquals(chatType, result.getType());
        assertFalse(result.getEncrypted());
        assertEquals("UNSECURE", result.getSecurityLevel()); // Для незашифрованных чатов уровень безопасности должен быть UNSECURE
    }

    @Test
    void testUpdateChatEncryption() {
        // Подготовка данных
        Long chatId = 1L;
        Boolean encrypted = true;
        String encryptionAlgorithm = "AES";
        String securityLevel = "SECURE";
        
        Chat existingChat = new Chat("Old Name", ChatType.GROUP, 1L);
        existingChat.setId(chatId);
        existingChat.setEncrypted(false);
        
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(existingChat));
        when(encryptionService.generateKey()).thenReturn("new-key");
        when(chatRepository.save(any(Chat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Вызов тестируемого метода
        Chat result = chatService.updateChatEncryption(chatId, encrypted, encryptionAlgorithm, securityLevel);

        // Проверки
        assertNotNull(result);
        assertTrue(result.getEncrypted());
        assertEquals(encryptionAlgorithm, result.getEncryptionAlgorithm());
        assertEquals(securityLevel, result.getSecurityLevel());
        assertNotNull(result.getEncryptionKey()); // Ключ должен быть сгенерирован
    }

    @Test
    void testSetModerator() {
        // Подготовка данных
        Long chatId = 1L;
        Long userId = 2L;
        
        Chat existingChat = new Chat("Test Chat", ChatType.GROUP, 1L);
        existingChat.setId(chatId);
        
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(existingChat));
        when(userChatRepository.findByChatIdAndUserId(chatId, userId))
            .thenReturn(java.util.Optional.empty()); // В тестовых целях возвращаем пустой результат

        // Вызов тестируемого метода
        Chat result = chatService.setModerator(chatId, userId);

        // Проверки
        assertNotNull(result);
        assertEquals(existingChat, result);
    }
}
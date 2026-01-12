package com.messenger.service;

import com.messenger.model.Chat;
import com.messenger.model.UserChat;
import com.messenger.model.enums.ChatType;
import com.messenger.model.enums.ChatRole;
import com.messenger.repository.ChatRepository;
import com.messenger.repository.UserChatRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ChatService {

    private final ChatRepository chatRepository;
    private final UserChatRepository userChatRepository;

    public ChatService(ChatRepository chatRepository, UserChatRepository userChatRepository) {
        this.chatRepository = chatRepository;
        this.userChatRepository = userChatRepository;
    }

    public List<Chat> getUserChats(Long userId) {
        List<UserChat> userChats = userChatRepository.findByUserId(userId);
        return userChats.stream()
                .map(uc -> chatRepository.findById(uc.getChatId()).orElse(null))
                .filter(chat -> chat != null)
                .toList();
    }

    public Chat createChat(String name, ChatType type, Boolean encrypted, String encryptionKey, Long createdById) {
        Chat chat = new Chat(name, type, createdById);
        chat.setEncrypted(encrypted != null ? encrypted : false);
        if (encrypted != null && encrypted) {
            // Если шифрование включено, генерируем ключ если он не предоставлен
            if (encryptionKey == null || encryptionKey.isEmpty()) {
                chat.setEncryptionKey(generateEncryptionKey());
            } else {
                chat.setEncryptionKey(encryptionKey);
            }
        }
        Chat savedChat = chatRepository.save(chat);
        // Add creator as owner to the chat
        UserChat userChat = new UserChat(savedChat.getId(), createdById, ChatRole.OWNER);
        userChatRepository.save(userChat);
        return savedChat;
    }

    public Chat createChat(String name, ChatType type, Long createdById) {
        return createChat(name, type, false, null, createdById);
    }

    public Chat addMemberToChat(Long chatId, Long userId, ChatRole role) {
        UserChat userChat = new UserChat(chatId, userId, role);
        userChatRepository.save(userChat);
        return chatRepository.findById(chatId).orElse(null);
    }

    public Optional<Chat> getChatById(Long chatId) {
        return chatRepository.findById(chatId);
    }

    private String generateEncryptionKey() {
        // Генерация случайного ключа шифрования
        return UUID.randomUUID().toString();
    }
}
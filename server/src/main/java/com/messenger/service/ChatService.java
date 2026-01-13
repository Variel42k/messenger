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
    private final EncryptionService encryptionService;

    public ChatService(ChatRepository chatRepository, UserChatRepository userChatRepository, EncryptionService encryptionService) {
        this.chatRepository = chatRepository;
        this.userChatRepository = userChatRepository;
        this.encryptionService = encryptionService;
    }

    public List<Chat> getUserChats(Long userId) {
        List<UserChat> userChats = userChatRepository.findByUserId(userId);
        return userChats.stream()
                .map(uc -> chatRepository.findById(uc.getChatId()).orElse(null))
                .filter(chat -> chat != null)
                .toList();
    }

    public Chat createChat(String name, ChatType type, Boolean encrypted, String encryptionKey, String encryptionAlgorithm, String securityLevel, Long createdById) {
        Chat chat = new Chat(name, type, createdById);
        chat.setEncrypted(encrypted != null ? encrypted : false);
        if (encrypted != null && encrypted) {
            // Если шифрование включено, генерируем ключ если он не предоставлен
            if (encryptionKey == null || encryptionKey.isEmpty()) {
                chat.setEncryptionKey(encryptionService.generateKey());
            } else {
                // Проверяем, является ли предоставленный ключ действительным
                if (encryptionService.isValidKey(encryptionKey)) {
                    chat.setEncryptionKey(encryptionKey);
                } else {
                    // Если ключ недействителен, генерируем новый
                    chat.setEncryptionKey(encryptionService.generateKey());
                }
            }
            // Установка алгоритма шифрования и уровня безопасности
            chat.setEncryptionAlgorithm(encryptionAlgorithm != null ? encryptionAlgorithm : "AES");
            chat.setSecurityLevel(securityLevel != null ? securityLevel : "SECURE");
        } else {
            // Для незашифрованных чатов устанавливаем уровень безопасности как "UNSECURE"
            chat.setSecurityLevel("UNSECURE");
        }
        Chat savedChat = chatRepository.save(chat);
        // Add creator as owner to the chat
        UserChat userChat = new UserChat(savedChat.getId(), createdById, ChatRole.OWNER);
        userChatRepository.save(userChat);
        return savedChat;
    }

    public Chat createChat(String name, ChatType type, Boolean encrypted, String encryptionKey, Long createdById) {
        return createChat(name, type, encrypted, encryptionKey, "AES", "SECURE", createdById);
    }

    public Chat createChat(String name, ChatType type, Long createdById) {
        return createChat(name, type, false, null, createdById);
    }

    public Chat addMemberToChat(Long chatId, Long userId, ChatRole role) {
        UserChat userChat = new UserChat(chatId, userId, role);
        userChatRepository.save(userChat);
        return chatRepository.findById(chatId).orElse(null);
    }

    public Chat removeMemberFromChat(Long chatId, Long userId) {
        Optional<UserChat> userChatOpt = userChatRepository.findByChatIdAndUserId(chatId, userId);
        if (userChatOpt.isPresent()) {
            userChatRepository.delete(userChatOpt.get());
        }
        return chatRepository.findById(chatId).orElse(null);
    }

    public Chat updateChatType(Long chatId, ChatType newType) {
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isPresent()) {
            Chat chat = chatOpt.get();
            chat.setType(newType);
            return chatRepository.save(chat);
        }
        return null;
    }

    public Chat updateChatEncryption(Long chatId, Boolean encrypted, String encryptionAlgorithm, String securityLevel) {
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isPresent()) {
            Chat chat = chatOpt.get();
            chat.setEncrypted(encrypted);
            if (encrypted != null && encrypted) {
                if (chat.getEncryptionKey() == null || chat.getEncryptionKey().isEmpty()) {
                    chat.setEncryptionKey(encryptionService.generateKey());
                }
                chat.setEncryptionAlgorithm(encryptionAlgorithm != null ? encryptionAlgorithm : "AES");
                chat.setSecurityLevel(securityLevel != null ? securityLevel : "SECURE");
            } else {
                chat.setSecurityLevel("UNSECURE");
            }
            return chatRepository.save(chat);
        }
        return null;
    }

    public Chat setModerator(Long chatId, Long userId) {
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isPresent()) {
            // Удаляем предыдущего модератора в чате, если есть
            List<UserChat> moderators = userChatRepository.findByChatIdAndRole(chatId, ChatRole.MODERATOR);
            for (UserChat mod : moderators) {
                mod.setRole(ChatRole.MEMBER);
                userChatRepository.save(mod);
            }
            // Устанавливаем нового модератора
            Optional<UserChat> userChatOpt = userChatRepository.findByChatIdAndUserId(chatId, userId);
            if (userChatOpt.isPresent()) {
                UserChat userChat = userChatOpt.get();
                userChat.setRole(ChatRole.MODERATOR);
                userChatRepository.save(userChat);
            }
        }
        return chatOpt.orElse(null);
    }

    public Optional<Chat> getChatById(Long chatId) {
        return chatRepository.findById(chatId);
    }

    public String encryptMessage(String message, String encryptionKey) {
        return encryptionService.encrypt(message, encryptionKey);
    }

    public String decryptMessage(String encryptedMessage, String encryptionKey) {
        return encryptionService.decrypt(encryptedMessage, encryptionKey);
    }

    private String generateEncryptionKey() {
        // Генерация случайного ключа шифрования
        return UUID.randomUUID().toString();
    }
}
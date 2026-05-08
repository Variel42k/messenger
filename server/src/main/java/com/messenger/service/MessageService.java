package com.messenger.service;

import com.messenger.model.Chat;
import com.messenger.model.File;
import com.messenger.model.Message;
import com.messenger.model.MessageFile;
import com.messenger.model.enums.MessageStatus;
import com.messenger.model.enums.MessageType;
import com.messenger.repository.MessageFileRepository;
import com.messenger.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageService.class);

    private final MessageRepository messageRepository;
    private final MessageFileRepository messageFileRepository;
    private final ChatService chatService;
    private final EncryptionService encryptionService;

    public MessageService(MessageRepository messageRepository, MessageFileRepository messageFileRepository,
            ChatService chatService, EncryptionService encryptionService) {
        this.messageRepository = messageRepository;
        this.messageFileRepository = messageFileRepository;
        this.chatService = chatService;
        this.encryptionService = encryptionService;
    }

    @Transactional(readOnly = true)
    public List<Message> getChatMessages(Long chatId) {
        List<Message> messages = messageRepository.findByChat_IdOrderByCreatedAtAsc(chatId);
        // Если чат зашифрован, расшифровываем сообщения перед возвратом
        Chat chat = chatService.getChatById(chatId).orElse(null);
        if (chat != null && chat.getEncrypted() && chat.getEncryptionKey() != null) {
            for (Message msg : messages) {
                if (msg.getContent() != null && !msg.getContent().isEmpty() && msg.isEncrypted()) {
                    try {
                        String decryptedContent = chatService.decryptMessage(msg.getContent(), chat.getEncryptionKey());
                        msg.setContent(decryptedContent);
                        msg.setEncrypted(false); // Указываем, что содержимое теперь в открытом виде
                    } catch (Exception e) {
                        // Логируем ошибку, но не прерываем выполнение
                        logger.warn("Error decrypting message: {}", e.getMessage());
                    }
                }
            }
        }
        return messages;
    }

    @Transactional(readOnly = true)
    public Optional<Message> findByClientMsgId(Long chatId, Long senderId, String clientMsgId) {
        if (clientMsgId == null || clientMsgId.isBlank()) {
            return Optional.empty();
        }
        return messageRepository.findByChat_IdAndSenderIdAndClientMsgId(chatId, senderId, clientMsgId);
    }

    @Transactional(readOnly = true)
    public Optional<Message> findById(Long messageId) {
        return messageRepository.findById(messageId);
    }

    @Transactional
    public Message saveMessage(Message message) {
        // Если чат зашифрован, шифруем сообщение перед сохранением
        Chat chat = chatService.getChatById(message.getChat().getId()).orElse(null);
        if (chat != null && chat.getEncrypted() && chat.getEncryptionKey() != null) {
            try {
                String encryptedContent = chatService.encryptMessage(message.getContent(), chat.getEncryptionKey());
                message.setContent(encryptedContent);
                message.setEncrypted(true); // Указываем, что содержимое зашифровано
            } catch (Exception e) {
                // Логируем ошибку, но не прерываем выполнение
                logger.warn("Error encrypting message: {}", e.getMessage());
            }
        }
        return messageRepository.save(message);
    }

    @Transactional
    public Message saveMessageWithFile(Message message, File file) {
        // Если чат зашифрован, шифруем содержимое сообщения перед сохранением
        Chat chat = chatService.getChatById(message.getChat().getId()).orElse(null);
        if (chat != null && chat.getEncrypted() && chat.getEncryptionKey() != null) {
            try {
                String encryptedContent = chatService.encryptMessage(message.getContent(), chat.getEncryptionKey());
                message.setContent(encryptedContent);
                message.setEncrypted(true); // Указываем, что содержимое зашифровано
            } catch (Exception e) {
                // Логируем ошибку, но не прерываем выполнение
                logger.warn("Error encrypting message: {}", e.getMessage());
            }
        }

        Message savedMessage = messageRepository.save(message);

        if (file != null) {
            // Создаем связь между сообщением и файлом
            MessageFile messageFile = new MessageFile();
            messageFile.setMessageId(savedMessage.getId());
            messageFile.setFileId(file.getId());
            // Сохраняем связь между сообщением и файлом
            messageFileRepository.save(messageFile);
        }

        return savedMessage;
    }

    /**
     * Создает сообщение с использованием ID чата и отправителя
     */
    @Transactional
    public Message createMessage(Long chatId, Long senderId, String content) {
        return createMessage(chatId, senderId, content, null);
    }

    @Transactional
    public Message createMessage(Long chatId, Long senderId, String content, String clientMsgId) {
        if (clientMsgId != null && !clientMsgId.isBlank()) {
            Optional<Message> existingMessage = messageRepository.findByChat_IdAndSenderIdAndClientMsgId(
                    chatId, senderId, clientMsgId);
            if (existingMessage.isPresent()) {
                return existingMessage.get();
            }
        }

        // Получаем чат по ID
        Chat chat = chatService.getChatById(chatId).orElse(null);
        if (chat == null) {
            throw new IllegalArgumentException("Chat not found with id: " + chatId);
        }
        if (!chatService.isUserMember(chatId, senderId)) {
            throw new IllegalStateException("Sender is not a member of this chat");
        }

        // Создаем сообщение
        Message message = new Message();
        message.setChat(chat);
        message.setSenderId(senderId);
        message.setContent(content);
        message.setClientMsgId(clientMsgId);
        message.setMessageType(MessageType.TEXT);
        message.setStatus(MessageStatus.SENT);
        message.setCreatedAt(LocalDateTime.now());
        message.setUpdatedAt(LocalDateTime.now());

        // Если чат зашифрован, шифруем содержимое сообщения перед сохранением
        if (chat.getEncrypted() && chat.getEncryptionKey() != null) {
            try {
                String encryptedContent = chatService.encryptMessage(message.getContent(), chat.getEncryptionKey());
                message.setContent(encryptedContent);
                message.setEncrypted(true); // Указываем, что содержимое зашифровано
            } catch (Exception e) {
                // Логируем ошибку, но не прерываем выполнение
                logger.warn("Error encrypting message: {}", e.getMessage());
            }
        }

        return messageRepository.save(message);
    }

    @Transactional
    public Message updateMessageContent(Long messageId, String content) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found with id: " + messageId));
        if (message.getDeletedAt() != null) {
            throw new IllegalStateException("Deleted messages cannot be edited");
        }

        message.setContent(content);
        message.setEditedAt(LocalDateTime.now());
        message.setUpdatedAt(LocalDateTime.now());

        Chat chat = message.getChat();
        if (chat != null && chat.getEncrypted() && chat.getEncryptionKey() != null) {
            try {
                message.setContent(chatService.encryptMessage(content, chat.getEncryptionKey()));
                message.setEncrypted(true);
            } catch (Exception e) {
                logger.warn("Error encrypting edited message: {}", e.getMessage());
            }
        }

        return messageRepository.save(message);
    }

    @Transactional
    public Message softDeleteMessage(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found with id: " + messageId));
        message.setDeletedAt(LocalDateTime.now());
        message.setUpdatedAt(LocalDateTime.now());
        message.setContent(null);
        return messageRepository.save(message);
    }

    public Message updateMessageStatus(Long messageId, MessageStatus status) {
        Optional<Message> messageOpt = messageRepository.findById(messageId);
        if (messageOpt.isPresent()) {
            Message message = messageOpt.get();
            message.setStatus(status);
            return messageRepository.save(message);
        }
        return null;
    }

    public List<Message> getMessagesByStatus(Long chatId, MessageStatus status) {
        return messageRepository.findByChat_IdAndStatus(chatId, status);
    }
}

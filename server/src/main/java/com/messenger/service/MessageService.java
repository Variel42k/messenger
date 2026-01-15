package com.messenger.service;

import com.messenger.model.Chat;
import com.messenger.model.File;
import com.messenger.model.Message;
import com.messenger.model.MessageFile;
import com.messenger.model.enums.MessageStatus;
import com.messenger.repository.MessageFileRepository;
import com.messenger.repository.MessageRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final MessageFileRepository messageFileRepository;
    private final ChatService chatService;
    private final EncryptionService encryptionService;

    public MessageService(MessageRepository messageRepository, MessageFileRepository messageFileRepository, ChatService chatService, EncryptionService encryptionService) {
        this.messageRepository = messageRepository;
        this.messageFileRepository = messageFileRepository;
        this.chatService = chatService;
        this.encryptionService = encryptionService;
    }

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
                        System.err.println("Ошибка при расшифровке сообщения: " + e.getMessage());
                    }
                }
            }
        }
        return messages;
    }

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
                System.err.println("Ошибка при шифровании сообщения: " + e.getMessage());
            }
        }
        return messageRepository.save(message);
    }

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
                System.err.println("Ошибка при шифровании сообщения: " + e.getMessage());
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
    public Message createMessage(Long chatId, Long senderId, String content) {
        // Получаем чат по ID
        Chat chat = chatService.getChatById(chatId).orElse(null);
        if (chat == null) {
            throw new IllegalArgumentException("Chat not found with id: " + chatId);
        }

        // Создаем сообщение
        Message message = new Message();
        message.setChat(chat);
        message.setSenderId(senderId);
        message.setContent(content);

        // Если чат зашифрован, шифруем содержимое сообщения перед сохранением
        if (chat.getEncrypted() && chat.getEncryptionKey() != null) {
            try {
                String encryptedContent = chatService.encryptMessage(message.getContent(), chat.getEncryptionKey());
                message.setContent(encryptedContent);
                message.setEncrypted(true); // Указываем, что содержимое зашифровано
            } catch (Exception e) {
                // Логируем ошибку, но не прерываем выполнение
                System.err.println("Ошибка при шифровании сообщения: " + e.getMessage());
            }
        }

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
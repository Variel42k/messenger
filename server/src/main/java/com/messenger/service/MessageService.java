package com.messenger.service;

import com.messenger.model.Message;
import com.messenger.model.enums.MessageStatus;
import com.messenger.repository.MessageRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MessageService {

    private final MessageRepository messageRepository;

    public MessageService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public List<Message> getChatMessages(Long chatId) {
        return messageRepository.findByChat_IdOrderByCreatedAtAsc(chatId);
    }

    public Message saveMessage(Message message) {
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
package com.messenger.controller;

import com.messenger.model.File;
import com.messenger.model.Message;
import com.messenger.model.MessageFile;
import com.messenger.model.User;
import com.messenger.repository.MessageFileRepository;
import com.messenger.service.FileService;
import com.messenger.service.MessageService;
import com.messenger.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Controller for message management
 */
@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private static final Logger logger = LoggerFactory.getLogger(MessageController.class);

    private final MessageService messageService;
    private final FileService fileService;
    private final MessageFileRepository messageFileRepository;
    private final UserService userService;

    public MessageController(MessageService messageService, FileService fileService,
            MessageFileRepository messageFileRepository, UserService userService) {
        this.messageService = messageService;
        this.fileService = fileService;
        this.messageFileRepository = messageFileRepository;
        this.userService = userService;
    }

    /**
     * Helper to get current user's ID from JWT
     */
    private Long getCurrentUserId(UserDetails userDetails) {
        User user = userService.findByUsernameOrEmail(userDetails.getUsername());
        return user != null ? user.getId() : null;
    }

    /**
     * Get messages for a chat
     */
    @GetMapping("/chat/{chatId}")
    public List<Message> getChatMessages(@PathVariable Long chatId) {
        return messageService.getChatMessages(chatId);
    }

    /**
     * Send message with file attachment
     */
    @PostMapping("/with-file")
    public ResponseEntity<Message> sendMessageWithFile(
            @RequestParam("chatId") Long chatId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(value = "senderId", required = false) Long senderId) {
        try {
            Long resolvedSenderId = senderId != null ? senderId : getCurrentUserId(userDetails);
            if (resolvedSenderId == null) {
                return ResponseEntity.badRequest().build();
            }

            File attachedFile = null;
            if (file != null && !file.isEmpty()) {
                attachedFile = fileService.saveFile(file, resolvedSenderId);
            }

            Message savedMessage = messageService.createMessage(chatId, resolvedSenderId,
                    content != null ? content : "");

            if (attachedFile != null) {
                MessageFile messageFile = new MessageFile();
                messageFile.setMessageId(savedMessage.getId());
                messageFile.setFileId(attachedFile.getId());
                messageFileRepository.save(messageFile);
            }

            return ResponseEntity.ok(savedMessage);
        } catch (Exception e) {
            logger.error("Error sending message with file: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Create a message using chat and sender IDs
     */
    @PostMapping("/create")
    public ResponseEntity<Message> createMessage(
            @RequestParam("chatId") Long chatId,
            @RequestParam("content") String content,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(value = "senderId", required = false) Long senderId) {
        try {
            Long resolvedSenderId = senderId != null ? senderId : getCurrentUserId(userDetails);
            if (resolvedSenderId == null) {
                return ResponseEntity.badRequest().build();
            }
            Message message = messageService.createMessage(chatId, resolvedSenderId, content);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            logger.error("Error creating message: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
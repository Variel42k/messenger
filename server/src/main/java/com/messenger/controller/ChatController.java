package com.messenger.controller;

import com.messenger.dto.CreateChatRequest;
import com.messenger.model.Chat;
import com.messenger.model.User;
import com.messenger.model.enums.ChatType;
import com.messenger.model.enums.ChatRole;
import com.messenger.service.ChatService;
import com.messenger.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for chat management
 */
@RestController
@RequestMapping("/api/chats")
public class ChatController {

    private final ChatService chatService;
    private final UserService userService;

    public ChatController(ChatService chatService, UserService userService) {
        this.chatService = chatService;
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
     * Get chats for the authenticated user
     */
    @GetMapping
    public ResponseEntity<List<Chat>> getUserChats(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long userId) {
        // Use userId from JWT if not provided (backward compatibility)
        Long resolvedUserId = userId != null ? userId : getCurrentUserId(userDetails);
        if (resolvedUserId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(chatService.getUserChats(resolvedUserId));
    }

    /**
     * Create a new chat
     */
    @PostMapping
    public ResponseEntity<Chat> createChat(@RequestBody CreateChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long createdById) {
        // Use createdById from JWT if not provided (backward compatibility)
        Long resolvedCreatedById = createdById != null ? createdById : getCurrentUserId(userDetails);
        if (resolvedCreatedById == null) {
            return ResponseEntity.badRequest().build();
        }
        Chat chat = chatService.createChat(request.getName(), request.getType(), request.getEncrypted(),
                request.getEncryptionKey(), request.getEncryptionAlgorithm(), request.getSecurityLevel(),
                resolvedCreatedById);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get chat by ID
     */
    @GetMapping("/{chatId}")
    public ResponseEntity<Chat> getChatById(@PathVariable Long chatId) {
        return chatService.getChatById(chatId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Add member to chat
     */
    @PostMapping("/{chatId}/members")
    public ResponseEntity<Chat> addMemberToChat(@PathVariable Long chatId,
            @RequestParam Long userId,
            @RequestParam String role) {
        Chat chat = chatService.addMemberToChat(chatId, userId,
                ChatRole.valueOf(role.toUpperCase()));
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Remove member from chat
     */
    @DeleteMapping("/{chatId}/members/{userId}")
    public ResponseEntity<Chat> removeMemberFromChat(@PathVariable Long chatId,
            @PathVariable Long userId) {
        Chat chat = chatService.removeMemberFromChat(chatId, userId);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update chat type
     */
    @PutMapping("/{chatId}/type")
    public ResponseEntity<Chat> updateChatType(@PathVariable Long chatId,
            @RequestParam ChatType newType) {
        Chat chat = chatService.updateChatType(chatId, newType);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update chat encryption settings
     */
    @PutMapping("/{chatId}/encryption")
    public ResponseEntity<Chat> updateChatEncryption(@PathVariable Long chatId,
            @RequestParam(required = false) Boolean encrypted,
            @RequestParam(required = false) String encryptionAlgorithm,
            @RequestParam(required = false) String securityLevel) {
        Chat chat = chatService.updateChatEncryption(chatId, encrypted, encryptionAlgorithm, securityLevel);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Set moderator
     */
    @PutMapping("/{chatId}/moderator")
    public ResponseEntity<Chat> setModerator(@PathVariable Long chatId,
            @RequestParam Long userId) {
        Chat chat = chatService.setModerator(chatId, userId);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}
package com.messenger.controller;

import com.messenger.dto.CreateChatRequest;
import com.messenger.model.Chat;
import com.messenger.model.User;
import com.messenger.model.enums.ChatType;
import com.messenger.model.enums.ChatRole;
import com.messenger.model.enums.UserRole;
import com.messenger.service.ChatService;
import com.messenger.service.UserService;
import org.springframework.http.HttpStatus;
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
    private User getCurrentUser(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userService.findByUsernameOrEmail(userDetails.getUsername());
    }

    private boolean isAdmin(User user) {
        return user != null && user.getRole() == UserRole.ADMIN;
    }

    /**
     * Get chats for the authenticated user
     */
    @GetMapping
    public ResponseEntity<List<Chat>> getUserChats(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long userId) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long resolvedUserId = currentUser.getId();
        if (userId != null && !userId.equals(currentUser.getId())) {
            if (!isAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            resolvedUserId = userId;
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
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long resolvedCreatedById = currentUser.getId();
        if (createdById != null && !createdById.equals(currentUser.getId())) {
            if (!isAdmin(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            resolvedCreatedById = createdById;
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
    public ResponseEntity<Chat> getChatById(@PathVariable Long chatId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (!isAdmin(currentUser) && !chatService.isUserMember(chatId, currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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
            @RequestParam String role,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean canManageMembers = isAdmin(currentUser)
                || chatService.userHasAnyRole(chatId, currentUser.getId(), ChatRole.OWNER, ChatRole.ADMIN,
                        ChatRole.MODERATOR);
        if (!canManageMembers) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        ChatRole chatRole;
        try {
            chatRole = ChatRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }

        if (chatRole == ChatRole.OWNER && !isAdmin(currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Chat chat = chatService.addMemberToChat(chatId, userId, chatRole);
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
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean canManageMembers = isAdmin(currentUser)
                || chatService.userHasAnyRole(chatId, currentUser.getId(), ChatRole.OWNER, ChatRole.ADMIN,
                        ChatRole.MODERATOR);
        if (!canManageMembers) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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
            @RequestParam ChatType newType,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean canManageSettings = isAdmin(currentUser)
                || chatService.userHasAnyRole(chatId, currentUser.getId(), ChatRole.OWNER, ChatRole.ADMIN);
        if (!canManageSettings) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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
            @RequestParam(required = false) String securityLevel,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean canManageSettings = isAdmin(currentUser)
                || chatService.userHasAnyRole(chatId, currentUser.getId(), ChatRole.OWNER, ChatRole.ADMIN);
        if (!canManageSettings) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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
            @RequestParam Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean canManageSettings = isAdmin(currentUser)
                || chatService.userHasAnyRole(chatId, currentUser.getId(), ChatRole.OWNER, ChatRole.ADMIN);
        if (!canManageSettings) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Chat chat = chatService.setModerator(chatId, userId);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}

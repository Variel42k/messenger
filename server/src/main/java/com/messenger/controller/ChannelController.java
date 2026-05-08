package com.messenger.controller;

import com.messenger.dto.CreateChannelMessageRequest;
import com.messenger.dto.CreateChannelRequest;
import com.messenger.dto.MemberRequest;
import com.messenger.dto.UpdateMemberRoleRequest;
import com.messenger.model.Chat;
import com.messenger.model.Message;
import com.messenger.model.User;
import com.messenger.model.enums.ChatType;
import com.messenger.service.AccessControlService;
import com.messenger.service.AuditLogService;
import com.messenger.service.ChatService;
import com.messenger.service.MessageService;
import com.messenger.service.RealtimeEventPublisher;
import com.messenger.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class ChannelController {
    private final ChatService chatService;
    private final MessageService messageService;
    private final UserService userService;
    private final AccessControlService accessControlService;
    private final AuditLogService auditLogService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public ChannelController(ChatService chatService, MessageService messageService, UserService userService,
            AccessControlService accessControlService, AuditLogService auditLogService,
            RealtimeEventPublisher realtimeEventPublisher) {
        this.chatService = chatService;
        this.messageService = messageService;
        this.userService = userService;
        this.accessControlService = accessControlService;
        this.auditLogService = auditLogService;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @PostMapping("/api/groups/{groupId}/channels")
    public ResponseEntity<Chat> createChannel(@PathVariable Long groupId,
            @Valid @RequestBody CreateChannelRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!accessControlService.canManageSettings(currentUser, groupId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Chat channel = chatService.createChannel(
                groupId, request.getName(), request.getDescription(), request.getReadonly(), currentUser.getId());
        auditLogService.record(currentUser, "channel.created", "channel", channel.getId(), channel.getId(),
                channel.getName());
        realtimeEventPublisher.publishToChannel(channel.getId(), "channel.updated", channel.getId(),
                Map.of("channelId", channel.getId(), "groupId", groupId, "name", channel.getName()));
        return ResponseEntity.status(HttpStatus.CREATED).body(channel);
    }

    @GetMapping("/api/channels/{channelId}")
    public ResponseEntity<Chat> getChannel(@PathVariable Long channelId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!accessControlService.canRead(currentUser, channelId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Chat> channel = chatService.getChatById(channelId)
                .filter(chat -> chat.getType() == ChatType.CHANNEL)
                .filter(chat -> chat.getDeletedAt() == null);
        return channel.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/api/channels/{channelId}/messages")
    public ResponseEntity<List<Message>> getMessages(@PathVariable Long channelId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!accessControlService.canRead(currentUser, channelId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(messageService.getChatMessages(channelId));
    }

    @PostMapping("/api/channels/{channelId}/messages")
    public ResponseEntity<Message> postMessage(@PathVariable Long channelId,
            @Valid @RequestBody CreateChannelMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Chat channel = chatService.getChatById(channelId)
                .filter(chat -> chat.getType() == ChatType.CHANNEL)
                .filter(chat -> chat.getDeletedAt() == null)
                .orElse(null);
        if (!accessControlService.canSendMessage(currentUser, channel)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean duplicate = messageService.findByClientMsgId(channelId, currentUser.getId(), request.getClientMsgId()).isPresent();
        Message message = messageService.createMessage(
                channelId, currentUser.getId(), request.getContent(), request.getClientMsgId());
        if (!duplicate) {
            realtimeEventPublisher.publishToChannel(channelId, "message.created", message.getId(),
                    Map.of("messageId", message.getId(), "senderId", currentUser.getId(),
                            "clientMsgId", request.getClientMsgId() == null ? "" : request.getClientMsgId()));
        }
        return ResponseEntity.status(duplicate ? HttpStatus.OK : HttpStatus.CREATED).body(message);
    }

    @PostMapping("/api/channels/{channelId}/members")
    public ResponseEntity<Chat> addMember(@PathVariable Long channelId,
            @Valid @RequestBody MemberRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        boolean addsPrivilegedRole = request.getRole() == com.messenger.model.enums.ChatRole.MODERATOR
                || request.getRole() == com.messenger.model.enums.ChatRole.ADMIN
                || request.getRole() == com.messenger.model.enums.ChatRole.OWNER;
        boolean allowed = accessControlService.canManageMembers(currentUser, channelId)
                && (!addsPrivilegedRole || accessControlService.canChangeRole(currentUser, channelId, request.getRole()));
        if (!allowed) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Chat channel = chatService.addMemberToChat(channelId, request.getUserId(), request.getRole());
        auditLogService.record(currentUser, "membership.added", "user", request.getUserId(), channelId,
                request.getRole().name());
        realtimeEventPublisher.publishToChannel(channelId, "membership.added", request.getUserId(),
                Map.of("channelId", channelId, "userId", request.getUserId(), "role", request.getRole().name()));
        return ResponseEntity.ok(channel);
    }

    @PatchMapping("/api/channels/{channelId}/members/{userId}")
    public ResponseEntity<Chat> updateMember(@PathVariable Long channelId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateMemberRoleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!accessControlService.canChangeRole(currentUser, channelId, request.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Chat channel = chatService.addMemberToChat(channelId, userId, request.getRole());
        auditLogService.record(currentUser, "membership.role_changed", "user", userId, channelId,
                request.getRole().name());
        realtimeEventPublisher.publishToChannel(channelId, "membership.role_changed", userId,
                Map.of("channelId", channelId, "userId", userId, "role", request.getRole().name()));
        return ResponseEntity.ok(channel);
    }

    @DeleteMapping("/api/channels/{channelId}/members/{userId}")
    public ResponseEntity<Chat> removeMember(@PathVariable Long channelId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!accessControlService.canManageMembers(currentUser, channelId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Chat channel = chatService.removeMemberFromChat(channelId, userId);
        auditLogService.record(currentUser, "membership.removed", "user", userId, channelId, null);
        realtimeEventPublisher.publishToChannel(channelId, "membership.removed", userId,
                Map.of("channelId", channelId, "userId", userId));
        return ResponseEntity.ok(channel);
    }

    private User currentUser(UserDetails userDetails) {
        return userDetails == null ? null : userService.findByUsernameOrEmail(userDetails.getUsername());
    }
}

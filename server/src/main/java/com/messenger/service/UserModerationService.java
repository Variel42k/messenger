package com.messenger.service;

import com.messenger.model.User;
import com.messenger.model.UserBan;
import com.messenger.model.enums.UserStatus;
import com.messenger.repository.UserBanRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class UserModerationService {
    private final UserService userService;
    private final ChatService chatService;
    private final AccessControlService accessControlService;
    private final UserBanRepository userBanRepository;
    private final AuditLogService auditLogService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final WsSessionService wsSessionService;

    public UserModerationService(UserService userService, ChatService chatService,
            AccessControlService accessControlService, UserBanRepository userBanRepository,
            AuditLogService auditLogService, RealtimeEventPublisher realtimeEventPublisher,
            WsSessionService wsSessionService) {
        this.userService = userService;
        this.chatService = chatService;
        this.accessControlService = accessControlService;
        this.userBanRepository = userBanRepository;
        this.auditLogService = auditLogService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.wsSessionService = wsSessionService;
    }

    @Transactional
    public User deactivate(User actor, Long userId, String reason) {
        requireSystemAdmin(actor);
        User user = requireUser(userId);
        user.setStatus(UserStatus.DEACTIVATED);
        user.setDeactivatedAt(LocalDateTime.now());
        User savedUser = userService.save(user);
        wsSessionService.disconnectActiveSessions(userId);
        auditLogService.record(actor, "user.deactivated", "user", userId, null, reason);
        realtimeEventPublisher.publishToUser(userId, "user.deactivated", userId, Map.of("userId", userId));
        return savedUser;
    }

    @Transactional
    public User reactivate(User actor, Long userId, String reason) {
        requireSystemAdmin(actor);
        User user = requireUser(userId);
        user.setStatus(UserStatus.ACTIVE);
        user.setDeactivatedAt(null);
        User savedUser = userService.save(user);
        auditLogService.record(actor, "user.reactivated", "user", userId, null, reason);
        realtimeEventPublisher.publishToUser(userId, "user.reactivated", userId, Map.of("userId", userId));
        return savedUser;
    }

    @Transactional
    public UserBan ban(User actor, Long userId, Long channelId, String reason, LocalDateTime expiresAt) {
        if (channelId == null) {
            requireSystemAdmin(actor);
        } else if (!accessControlService.canManageMembers(actor, channelId)) {
            throw new AccessDeniedException("Only channel moderators, admins, owners, or system admins can ban users");
        }

        User user = requireUser(userId);
        UserBan ban = userBanRepository.save(new UserBan(userId, channelId, actor.getId(), reason, expiresAt));

        if (channelId == null) {
            user.setStatus(UserStatus.BANNED);
            userService.save(user);
            wsSessionService.disconnectActiveSessions(userId);
            realtimeEventPublisher.publishToUser(userId, "user.banned", userId, Map.of("userId", userId));
        } else {
            chatService.removeMemberFromChat(channelId, userId);
            realtimeEventPublisher.publishToChannel(channelId, "user.banned", ban.getId(),
                    Map.of("userId", userId, "channelId", channelId));
        }

        auditLogService.record(actor, "user.banned", "user", userId, channelId, reason);
        return ban;
    }

    private void requireSystemAdmin(User actor) {
        if (!accessControlService.isSystemAdmin(actor)) {
            throw new AccessDeniedException("System administrator role is required");
        }
    }

    private User requireUser(Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found with id: " + userId);
        }
        return user;
    }
}

package com.messenger.service;

import com.messenger.model.Chat;
import com.messenger.model.Message;
import com.messenger.model.User;
import com.messenger.model.UserChat;
import com.messenger.model.enums.ChatRole;
import com.messenger.model.enums.MembershipState;
import com.messenger.model.enums.UserRole;
import com.messenger.model.enums.UserStatus;
import com.messenger.repository.UserBanRepository;
import com.messenger.repository.UserChatRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

@Service
public class AccessControlService {
    private static final Set<ChatRole> WRITE_ROLES = Set.of(ChatRole.MEMBER, ChatRole.MODERATOR, ChatRole.ADMIN, ChatRole.OWNER);
    private static final Set<ChatRole> MODERATE_ROLES = Set.of(ChatRole.MODERATOR, ChatRole.ADMIN, ChatRole.OWNER);
    private static final Set<ChatRole> ADMIN_ROLES = Set.of(ChatRole.ADMIN, ChatRole.OWNER);

    private final UserChatRepository userChatRepository;
    private final UserBanRepository userBanRepository;

    public AccessControlService(UserChatRepository userChatRepository, UserBanRepository userBanRepository) {
        this.userChatRepository = userChatRepository;
        this.userBanRepository = userBanRepository;
    }

    public boolean isActive(User user) {
        return user != null && user.getStatus() == UserStatus.ACTIVE && user.getDeletedAt() == null;
    }

    public boolean isSystemAdmin(User user) {
        return isActive(user) && user.getRole() == UserRole.ADMIN;
    }

    @Transactional(readOnly = true)
    public Optional<UserChat> activeMembership(Long channelId, Long userId) {
        return userChatRepository.findByChatIdAndUserId(channelId, userId)
                .filter(membership -> membership.getState() == MembershipState.ACTIVE)
                .filter(membership -> membership.getLeftAt() == null);
    }

    @Transactional(readOnly = true)
    public boolean canRead(User user, Long channelId) {
        if (!isActive(user)) {
            return false;
        }
        if (isSystemAdmin(user)) {
            return !userBanRepository.hasActiveBan(user.getId(), channelId);
        }
        return activeMembership(channelId, user.getId()).isPresent()
                && !userBanRepository.hasActiveBan(user.getId(), channelId);
    }

    @Transactional(readOnly = true)
    public boolean canSendMessage(User user, Chat channel) {
        if (channel == null || !isActive(user) || userBanRepository.hasActiveBan(user.getId(), channel.getId())) {
            return false;
        }
        if (isSystemAdmin(user)) {
            return true;
        }
        Optional<UserChat> membership = activeMembership(channel.getId(), user.getId());
        if (membership.isEmpty()) {
            return false;
        }
        ChatRole role = membership.get().getRole();
        if (Boolean.TRUE.equals(channel.getReadonly())) {
            return MODERATE_ROLES.contains(role);
        }
        return WRITE_ROLES.contains(role);
    }

    @Transactional(readOnly = true)
    public boolean canManageMembers(User user, Long channelId) {
        if (isSystemAdmin(user)) {
            return true;
        }
        return isActive(user) && activeMembership(channelId, user.getId())
                .map(UserChat::getRole)
                .filter(MODERATE_ROLES::contains)
                .isPresent();
    }

    @Transactional(readOnly = true)
    public boolean canChangeRole(User user, Long channelId, ChatRole requestedRole) {
        if (isSystemAdmin(user)) {
            return true;
        }
        Optional<UserChat> membership = activeMembership(channelId, user.getId());
        if (membership.isEmpty()) {
            return false;
        }
        ChatRole actorRole = membership.get().getRole();
        if (!ADMIN_ROLES.contains(actorRole)) {
            return false;
        }
        return requestedRole != ChatRole.OWNER || actorRole == ChatRole.OWNER;
    }

    @Transactional(readOnly = true)
    public boolean canManageSettings(User user, Long channelId) {
        if (isSystemAdmin(user)) {
            return true;
        }
        return isActive(user) && activeMembership(channelId, user.getId())
                .map(UserChat::getRole)
                .filter(ADMIN_ROLES::contains)
                .isPresent();
    }

    @Transactional(readOnly = true)
    public boolean canMutateMessage(User user, Message message) {
        if (message == null || message.getDeletedAt() != null || !isActive(user)) {
            return false;
        }
        if (isSystemAdmin(user)) {
            return true;
        }
        Long channelId = message.getChatId();
        if (message.getSenderId() != null && message.getSenderId().equals(user.getId())) {
            return canRead(user, channelId);
        }
        return canManageMembers(user, channelId);
    }
}

package com.messenger.service;

import com.messenger.model.Chat;
import com.messenger.model.User;
import com.messenger.model.UserChat;
import com.messenger.model.enums.ChatRole;
import com.messenger.model.enums.ChatType;
import com.messenger.model.enums.MembershipState;
import com.messenger.model.enums.UserRole;
import com.messenger.model.enums.UserStatus;
import com.messenger.repository.UserBanRepository;
import com.messenger.repository.UserChatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccessControlServiceTest {
    @Mock
    private UserChatRepository userChatRepository;

    @Mock
    private UserBanRepository userBanRepository;

    private AccessControlService accessControlService;

    @BeforeEach
    void setUp() {
        accessControlService = new AccessControlService(userChatRepository, userBanRepository);
    }

    @Test
    void deactivatedUserCannotReadEvenWithMembership() {
        User user = user(10L, UserRole.USER, UserStatus.DEACTIVATED);

        assertFalse(accessControlService.canRead(user, 100L));
    }

    @Test
    void guestCanReadButCannotSend() {
        User user = user(10L, UserRole.USER, UserStatus.ACTIVE);
        Chat channel = channel(100L, false);
        when(userChatRepository.findByChatIdAndUserId(100L, 10L)).thenReturn(Optional.of(membership(ChatRole.GUEST)));
        when(userBanRepository.hasActiveBan(10L, 100L)).thenReturn(false);

        assertTrue(accessControlService.canRead(user, 100L));
        assertFalse(accessControlService.canSendMessage(user, channel));
    }

    @Test
    void readonlyChannelAllowsModeratorAndDeniesMemberWrites() {
        User member = user(11L, UserRole.USER, UserStatus.ACTIVE);
        Chat readonlyChannel = channel(100L, true);
        when(userBanRepository.hasActiveBan(11L, 100L)).thenReturn(false);
        when(userChatRepository.findByChatIdAndUserId(100L, 11L)).thenReturn(Optional.of(membership(ChatRole.MEMBER)));

        assertFalse(accessControlService.canSendMessage(member, readonlyChannel));

        User moderator = user(12L, UserRole.USER, UserStatus.ACTIVE);
        when(userBanRepository.hasActiveBan(12L, 100L)).thenReturn(false);
        when(userChatRepository.findByChatIdAndUserId(100L, 12L)).thenReturn(Optional.of(membership(ChatRole.MODERATOR)));

        assertTrue(accessControlService.canSendMessage(moderator, readonlyChannel));
    }

    @Test
    void activeBanDeniesChannelAccess() {
        User user = user(10L, UserRole.USER, UserStatus.ACTIVE);
        when(userBanRepository.hasActiveBan(10L, 100L)).thenReturn(true);
        when(userChatRepository.findByChatIdAndUserId(100L, 10L)).thenReturn(Optional.of(membership(ChatRole.MEMBER)));

        assertFalse(accessControlService.canRead(user, 100L));
    }

    @Test
    void systemAdminCanReadWithoutMembership() {
        User admin = user(1L, UserRole.ADMIN, UserStatus.ACTIVE);
        when(userBanRepository.hasActiveBan(1L, 100L)).thenReturn(false);

        assertTrue(accessControlService.canRead(admin, 100L));
    }

    private User user(Long id, UserRole role, UserStatus status) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setStatus(status);
        return user;
    }

    private Chat channel(Long id, boolean readonly) {
        Chat channel = new Chat("channel", ChatType.CHANNEL, 1L);
        channel.setId(id);
        channel.setReadonly(readonly);
        return channel;
    }

    private UserChat membership(ChatRole role) {
        UserChat membership = new UserChat();
        membership.setRole(role);
        membership.setState(MembershipState.ACTIVE);
        return membership;
    }
}

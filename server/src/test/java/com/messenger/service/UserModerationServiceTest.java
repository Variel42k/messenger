package com.messenger.service;

import com.messenger.model.User;
import com.messenger.model.UserBan;
import com.messenger.model.enums.UserRole;
import com.messenger.model.enums.UserStatus;
import com.messenger.repository.UserBanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserModerationServiceTest {
    @Mock
    private UserService userService;

    @Mock
    private ChatService chatService;

    @Mock
    private AccessControlService accessControlService;

    @Mock
    private UserBanRepository userBanRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private RealtimeEventPublisher realtimeEventPublisher;

    @Mock
    private WsSessionService wsSessionService;

    private UserModerationService userModerationService;

    @BeforeEach
    void setUp() {
        userModerationService = new UserModerationService(
                userService, chatService, accessControlService, userBanRepository,
                auditLogService, realtimeEventPublisher, wsSessionService);
    }

    @Test
    void deactivateDisconnectsSessionsAndPublishesEvent() {
        User actor = user(1L, UserRole.ADMIN, UserStatus.ACTIVE);
        User target = user(2L, UserRole.USER, UserStatus.ACTIVE);
        when(accessControlService.isSystemAdmin(actor)).thenReturn(true);
        when(userService.findById(2L)).thenReturn(target);
        when(userService.save(target)).thenReturn(target);

        userModerationService.deactivate(actor, 2L, "offboarding");

        verify(wsSessionService).disconnectActiveSessions(2L);
        verify(auditLogService).record(actor, "user.deactivated", "user", 2L, null, "offboarding");
        verify(realtimeEventPublisher).publishToUser(eq(2L), eq("user.deactivated"), eq(2L), anyMap());
    }

    @Test
    void channelBanRemovesMembershipAndPublishesEvent() {
        User actor = user(1L, UserRole.USER, UserStatus.ACTIVE);
        User target = user(2L, UserRole.USER, UserStatus.ACTIVE);
        when(accessControlService.canManageMembers(actor, 99L)).thenReturn(true);
        when(userService.findById(2L)).thenReturn(target);
        when(userBanRepository.save(any(UserBan.class))).thenAnswer(invocation -> {
            UserBan ban = invocation.getArgument(0);
            ban.setId(7L);
            return ban;
        });

        userModerationService.ban(actor, 2L, 99L, "channel policy", null);

        verify(chatService).removeMemberFromChat(99L, 2L);
        verify(auditLogService).record(actor, "user.banned", "user", 2L, 99L, "channel policy");
        verify(realtimeEventPublisher).publishToChannel(eq(99L), eq("user.banned"), eq(7L), anyMap());
    }

    private User user(Long id, UserRole role, UserStatus status) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setStatus(status);
        return user;
    }
}

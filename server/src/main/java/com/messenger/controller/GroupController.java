package com.messenger.controller;

import com.messenger.dto.CreateGroupRequest;
import com.messenger.model.Chat;
import com.messenger.model.User;
import com.messenger.service.AccessControlService;
import com.messenger.service.AuditLogService;
import com.messenger.service.ChatService;
import com.messenger.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
    private final ChatService chatService;
    private final UserService userService;
    private final AccessControlService accessControlService;
    private final AuditLogService auditLogService;

    public GroupController(ChatService chatService, UserService userService,
            AccessControlService accessControlService, AuditLogService auditLogService) {
        this.chatService = chatService;
        this.userService = userService;
        this.accessControlService = accessControlService;
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<Chat> createGroup(@Valid @RequestBody CreateGroupRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!accessControlService.isActive(currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Chat group = chatService.createGroup(request.getName(), request.getDescription(), currentUser.getId());
        auditLogService.record(currentUser, "group.created", "group", group.getId(), null, group.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(group);
    }

    private User currentUser(UserDetails userDetails) {
        return userDetails == null ? null : userService.findByUsernameOrEmail(userDetails.getUsername());
    }
}

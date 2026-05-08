package com.messenger.controller;

import com.messenger.dto.UserModerationRequest;
import com.messenger.model.User;
import com.messenger.model.UserBan;
import com.messenger.service.UserModerationService;
import com.messenger.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserModerationController {
    private final UserModerationService userModerationService;
    private final UserService userService;

    public UserModerationController(UserModerationService userModerationService, UserService userService) {
        this.userModerationService = userModerationService;
        this.userService = userService;
    }

    @PostMapping("/{userId}/deactivate")
    public ResponseEntity<User> deactivate(@PathVariable Long userId,
            @RequestBody(required = false) UserModerationRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserModerationRequest resolvedRequest = request != null ? request : new UserModerationRequest();
        return ResponseEntity.ok(userModerationService.deactivate(currentUser, userId, resolvedRequest.getReason()));
    }

    @PostMapping("/{userId}/ban")
    public ResponseEntity<UserBan> ban(@PathVariable Long userId,
            @RequestBody(required = false) UserModerationRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserModerationRequest resolvedRequest = request != null ? request : new UserModerationRequest();
        return ResponseEntity.ok(userModerationService.ban(
                currentUser, userId, resolvedRequest.getChannelId(), resolvedRequest.getReason(),
                resolvedRequest.getExpiresAt()));
    }

    @PostMapping("/{userId}/reactivate")
    public ResponseEntity<User> reactivate(@PathVariable Long userId,
            @RequestBody(required = false) UserModerationRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserModerationRequest resolvedRequest = request != null ? request : new UserModerationRequest();
        return ResponseEntity.ok(userModerationService.reactivate(currentUser, userId, resolvedRequest.getReason()));
    }

    private User currentUser(UserDetails userDetails) {
        return userDetails == null ? null : userService.findByUsernameOrEmail(userDetails.getUsername());
    }
}

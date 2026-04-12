package com.messenger.controller;

import com.messenger.dto.AuthResponse;
import com.messenger.dto.RefreshTokenRequest;
import com.messenger.dto.TwoFactorCodeRequest;
import com.messenger.dto.TwoFactorLoginRequest;
import com.messenger.dto.TwoFactorSetupResponse;
import com.messenger.dto.TwoFactorStatusResponse;
import com.messenger.dto.UserLoginRequest;
import com.messenger.dto.UserRegistrationRequest;
import com.messenger.model.User;
import com.messenger.model.enums.UserStatus;
import com.messenger.security.JwtTokenProvider;
import com.messenger.service.TotpService;
import com.messenger.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Authentication controller for registration, login, and token refresh
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final TotpService totpService;

    public AuthController(UserService userService, PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider, AuthenticationManager authenticationManager,
            TotpService totpService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.totpService = totpService;
    }

    /**
     * Register a new user
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody UserRegistrationRequest request) {
        User existingUser = userService.findByUsernameOrEmail(request.getUsername());
        User existingByEmail = userService.findByEmail(request.getEmail());
        if (existingUser != null || existingByEmail != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "User already exists"));
        }

        // Create new user with encoded password
        User user = new User(request.getUsername(), request.getEmail(),
                passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.ACTIVE);
        userService.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", "User registered successfully");
        return ResponseEntity.ok(response);
    }

    /**
     * Authenticate user and issue JWT tokens
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody UserLoginRequest request) {
        try {
            Authentication authentication = authenticationManager
                    .authenticate(
                            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

            User user = userService.findByUsername(authentication.getName());
            if (user == null) {
                logger.warn("Login succeeded but user '{}' could not be loaded", authentication.getName());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            if (user.isTwoFactorEnabled()) {
                String twoFactorToken = jwtTokenProvider.generateTwoFactorToken(user.getUsername());
                return ResponseEntity.ok(AuthResponse.twoFactorRequired(
                        twoFactorToken,
                        user.getUsername(),
                        user.getRole().name()));
            }

            return ResponseEntity.ok(createAuthenticatedResponse(authentication, user));
        } catch (Exception e) {
            logger.warn("Login failed for user '{}': {} - {}", request.getUsername(),
                    e.getClass().getSimpleName(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/login/2fa")
    public ResponseEntity<?> completeTwoFactorLogin(@Valid @RequestBody TwoFactorLoginRequest request) {
        if (!jwtTokenProvider.validateTokenOfType(request.getTwoFactorToken(), JwtTokenProvider.TWO_FACTOR_TOKEN_TYPE)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "2FA challenge token is invalid or has expired"));
        }

        String username = jwtTokenProvider.getUsernameFromToken(request.getTwoFactorToken());
        User user = userService.findByUsername(username);
        if (user == null || !user.isTwoFactorEnabled() || user.getTwoFactorSecret() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Two-factor authentication is not configured for this user"));
        }

        if (!totpService.verifyCode(user.getTwoFactorSecret(), request.getCode())) {
            logger.warn("Invalid 2FA code for user '{}'", username);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid authentication code"));
        }

        UserDetails userDetails = userService.loadUserByUsername(username);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails.getUsername(), null, userDetails.getAuthorities());
        return ResponseEntity.ok(createAuthenticatedResponse(authentication, user));
    }

    /**
     * Refresh JWT token using refresh token
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        if (jwtTokenProvider.validateTokenOfType(request.getRefreshToken(), JwtTokenProvider.REFRESH_TOKEN_TYPE)) {
            String username = jwtTokenProvider.getUsernameFromToken(request.getRefreshToken());
            try {
                UserDetails userDetails = userService.loadUserByUsername(username);
                var auth = new UsernamePasswordAuthenticationToken(
                        userDetails.getUsername(), null, userDetails.getAuthorities());
                User user = userService.findByUsername(username);
                if (user == null) {
                    logger.warn("Token refresh failed because user '{}' no longer exists", username);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
                }

                return ResponseEntity.ok(createAuthenticatedResponse(auth, user));
            } catch (Exception e) {
                logger.warn("Token refresh failed for user '{}': {}", username, e.getMessage());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @GetMapping("/2fa/status")
    public ResponseEntity<?> getTwoFactorStatus(@AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveAuthenticatedUser(userDetails);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        boolean pendingSetup = user.getTwoFactorSecret() != null && !user.isTwoFactorEnabled();
        return ResponseEntity.ok(new TwoFactorStatusResponse(
                user.isTwoFactorEnabled(),
                pendingSetup,
                totpService.getIssuer(),
                user.getUsername()));
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<?> setupTwoFactor(@AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveAuthenticatedUser(userDetails);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        if (user.isTwoFactorEnabled()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Two-factor authentication is already enabled"));
        }

        String secret = totpService.generateSecret();
        user.setTwoFactorSecret(secret);
        user.setTwoFactorEnabled(false);
        userService.save(user);

        return ResponseEntity.ok(new TwoFactorSetupResponse(
                secret,
                secret,
                totpService.buildOtpAuthUri(user.getUsername(), secret),
                totpService.getIssuer(),
                user.getUsername()));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<?> enableTwoFactor(@AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TwoFactorCodeRequest request) {
        User user = resolveAuthenticatedUser(userDetails);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        if (user.getTwoFactorSecret() == null || user.getTwoFactorSecret().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Generate a 2FA secret before enabling two-factor authentication"));
        }

        if (!totpService.verifyCode(user.getTwoFactorSecret(), request.getCode())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid authentication code"));
        }

        user.setTwoFactorEnabled(true);
        userService.save(user);
        logger.info("Two-factor authentication enabled for user '{}'", user.getUsername());

        return ResponseEntity.ok(Map.of(
                "message", "Two-factor authentication enabled successfully",
                "enabled", true));
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<?> disableTwoFactor(@AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TwoFactorCodeRequest request) {
        User user = resolveAuthenticatedUser(userDetails);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        if (!user.isTwoFactorEnabled() || user.getTwoFactorSecret() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Two-factor authentication is not enabled"));
        }

        if (!totpService.verifyCode(user.getTwoFactorSecret(), request.getCode())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid authentication code"));
        }

        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userService.save(user);
        logger.info("Two-factor authentication disabled for user '{}'", user.getUsername());

        return ResponseEntity.ok(Map.of(
                "message", "Two-factor authentication disabled successfully",
                "enabled", false));
    }

    private AuthResponse createAuthenticatedResponse(Authentication authentication, User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);
        return AuthResponse.authenticated(
                accessToken,
                refreshToken,
                "Bearer",
                user.getUsername(),
                user.getRole().name());
    }

    private User resolveAuthenticatedUser(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userService.findByUsername(userDetails.getUsername());
    }
}

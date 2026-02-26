package com.messenger.controller;

import com.messenger.dto.AuthResponse;
import com.messenger.dto.RefreshTokenRequest;
import com.messenger.dto.UserLoginRequest;
import com.messenger.dto.UserRegistrationRequest;
import com.messenger.model.User;
import com.messenger.model.enums.UserStatus;
import com.messenger.security.JwtTokenProvider;
import com.messenger.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
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

    public AuthController(UserService userService, PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider, AuthenticationManager authenticationManager) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Register a new user
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody UserRegistrationRequest request) {
        User existingUser = userService.findByUsernameOrEmail(request.getUsername());
        if (existingUser != null) {
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

            String accessToken = jwtTokenProvider.generateAccessToken(authentication);
            String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);

            return ResponseEntity.ok(new AuthResponse(accessToken, refreshToken, "Bearer"));
        } catch (Exception e) {
            logger.warn("Login failed for user '{}': {} - {}", request.getUsername(),
                    e.getClass().getSimpleName(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Refresh JWT token using refresh token
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        if (jwtTokenProvider.validateToken(request.getRefreshToken())) {
            String username = jwtTokenProvider.getUsernameFromToken(request.getRefreshToken());
            try {
                UserDetails userDetails = userService.loadUserByUsername(username);
                var auth = new UsernamePasswordAuthenticationToken(
                        userDetails.getUsername(), null, userDetails.getAuthorities());
                String newAccessToken = jwtTokenProvider.generateAccessToken(auth);
                String newRefreshToken = jwtTokenProvider.generateRefreshToken(auth);

                return ResponseEntity.ok(new AuthResponse(newAccessToken, newRefreshToken, "Bearer"));
            } catch (Exception e) {
                logger.warn("Token refresh failed for user '{}': {}", username, e.getMessage());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
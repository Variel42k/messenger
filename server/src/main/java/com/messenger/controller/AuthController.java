package com.messenger.controller;

import com.messenger.model.User;
import com.messenger.model.enums.UserStatus;
import com.messenger.security.JwtTokenProvider;
import com.messenger.service.UserService;
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
 * Контроллер аутентификации для обработки регистрации, входа и обновления токенов
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

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
     * Регистрация нового пользователя
     * @param request Запрос с данными пользователя
     * @return Ответ с результатом регистрации
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody UserRegistrationRequest request) {
        User existingUser = userService.findByUsernameOrEmail(request.getUsername());
        if (existingUser != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "User already exists"));
        }

        // Создание нового пользователя с зашифрованным паролем
        User user = new User(request.getUsername(), request.getEmail(),
                passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.ACTIVE); // Устанавливаем статус активным по умолчанию
        User savedUser = userService.save(user);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "User registered successfully");
        return ResponseEntity.ok(response);
    }

    /**
     * Аутентификация пользователя и выдача JWT токенов
     * @param request Запрос с учетными данными пользователя
     * @return Ответ с JWT токенами
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody UserLoginRequest request) {
        try {
            // Аутентификация пользователя
            Authentication authentication = authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
            
            // Генерация токенов доступа и обновления
            String accessToken = jwtTokenProvider.generateAccessToken(authentication);
            String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);
            
            return ResponseEntity.ok(new AuthResponse(accessToken, refreshToken, "Bearer"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Обновление JWT токена с использованием токена обновления
     * @param request Запрос с токеном обновления
     * @return Ответ с новыми JWT токенами
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody RefreshTokenRequest request) {
        if (jwtTokenProvider.validateToken(request.getRefreshToken())) {
            // Извлечение имени пользователя из токена обновления
            String username = jwtTokenProvider.getUsernameFromToken(request.getRefreshToken());
            try {
                UserDetails userDetails = userService.loadUserByUsername(username);
                // Создание аутентификации и генерация новых токенов
                var auth = new UsernamePasswordAuthenticationToken(
                        userDetails.getUsername(), null, userDetails.getAuthorities());
                String newAccessToken = jwtTokenProvider.generateAccessToken(auth);
                String newRefreshToken = jwtTokenProvider.generateRefreshToken(auth);
                
                return ResponseEntity.ok(new AuthResponse(newAccessToken, newRefreshToken, "Bearer"));
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}

// Классы DTO для запросов и ответов
/**
 * DTO для запроса регистрации пользователя
 */
class UserRegistrationRequest {
    private String username;
    private String email;
    private String password;

    // Геттеры и сеттеры
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

/**
 * DTO для запроса входа пользователя
 */
class UserLoginRequest {
    private String username;
    private String password;

    // Геттеры и сеттеры
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

/**
 * DTO для запроса обновления токена
 */
class RefreshTokenRequest {
    private String refreshToken;

    // Геттеры и сеттеры
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
}

/**
 * DTO для ответа с аутентификационными токенами
 */
class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;

    public AuthResponse(String accessToken, String refreshToken, String tokenType) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType;
    }

    // Геттеры и сеттеры
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
}
package com.messenger.config;

import com.messenger.security.JwtAuthenticationFilter;
import com.messenger.security.JwtTokenProvider;
import com.messenger.service.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Конфигурация безопасности для мессенджера
 * Настройка JWT аутентификации, CORS и разрешений доступа
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserService userDetailsService;
    private final JwtTokenProvider jwtTokenProvider;

    public SecurityConfig(UserService userDetailsService, JwtTokenProvider jwtTokenProvider) {
        this.userDetailsService = userDetailsService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * Настройка цепочки фильтров безопасности
     * @param http Конфигурация HTTP безопасности
     * @param jwtAuthenticationFilter JWT фильтр аутентификации
     * @return Цепочка фильтров безопасности
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        http
            // Отключение CSRF для API
            .csrf(csrf -> csrf.disable())
            // Настройка CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Настройка сессии как STATELESS
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Настройка разрешений доступа к различным маршрутам
            .authorizeHttpRequests(authorize -> authorize
                // Разрешить доступ без аутентификации к маршрутам аутентификации, WebSocket и эндпоинтам состояния
                .requestMatchers("/api/auth/**", "/ws/**", "/actuator/health", "/actuator/info").permitAll()
                // Требовать роль ADMIN для администраторских маршрутов
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // Для всех остальных маршрутов требуется аутентификация
                .anyRequest().authenticated()
            )
            // Добавление JWT фильтра аутентификации
            .authenticationProvider(daoAuthenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Провайдер аутентификации
     * @return DaoAuthenticationProvider
     */
    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Менеджер аутентификации
     * @param config Конфигурация аутентификации
     * @return AuthenticationManager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Кодировщик паролей
     * @return BCrypt кодировщик паролей
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Источник конфигурации CORS
     * @return Источник конфигурации CORS
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Разрешить все источники (в продакшене следует ограничить)
        configuration.setAllowedOriginPatterns(List.of("*"));
        // Разрешить основные HTTP методы
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // Разрешить все заголовки
        configuration.setAllowedHeaders(List.of("*"));
        // Разрешить передачу учетных данных
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Применить конфигурацию ко всем маршрутам
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
package com.messenger.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Конфигурация WebSocket для обеспечения реального времени общения в
 * мессенджере
 * Настройка STOMP брокера сообщений и конечных точек
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${websocket.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:8080}")
    private String allowedOrigins;

    /**
     * Настройка брокера сообщений для WebSocket
     * 
     * @param config Регистр брокера сообщений
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Включение простого брокера для публикации/подписки на темы
        config.enableSimpleBroker("/topic", "/queue");
        // Префикс для приложений
        config.setApplicationDestinationPrefixes("/app");
        // Префикс для пользовательских точек назначения
        config.setUserDestinationPrefix("/user");
    }

    /**
     * Регистрация STOMP конечных точек
     * 
     * @param registry Регистр STOMP конечных точек
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Добавление конечной точки WebSocket с поддержкой CORS и SockJS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .withSockJS();
    }
}
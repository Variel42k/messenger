package com.messenger.service;

import com.messenger.model.WsSession;
import com.messenger.repository.WsSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class WsSessionService {
    private final WsSessionRepository wsSessionRepository;

    public WsSessionService(WsSessionRepository wsSessionRepository) {
        this.wsSessionRepository = wsSessionRepository;
    }

    @Transactional
    public void disconnectActiveSessions(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        wsSessionRepository.findByUserIdAndDisconnectedAtIsNull(userId)
                .forEach(session -> {
                    session.setDisconnectedAt(now);
                    session.setLastSeenAt(now);
                    wsSessionRepository.save(session);
                });
    }

    @Transactional
    public WsSession register(String sessionId, Long userId) {
        return wsSessionRepository.save(new WsSession(sessionId, userId));
    }

    @Transactional
    public void disconnect(String sessionId) {
        wsSessionRepository.findBySessionIdAndDisconnectedAtIsNull(sessionId)
                .ifPresent(session -> {
                    LocalDateTime now = LocalDateTime.now();
                    session.setDisconnectedAt(now);
                    session.setLastSeenAt(now);
                    wsSessionRepository.save(session);
                });
    }
}

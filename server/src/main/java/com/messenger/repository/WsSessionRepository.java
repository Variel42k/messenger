package com.messenger.repository;

import com.messenger.model.WsSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WsSessionRepository extends JpaRepository<WsSession, Long> {
    Optional<WsSession> findBySessionIdAndDisconnectedAtIsNull(String sessionId);

    List<WsSession> findByUserIdAndDisconnectedAtIsNull(Long userId);
}

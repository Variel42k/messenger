package com.messenger.service;

import com.messenger.model.AuditLog;
import com.messenger.model.User;
import com.messenger.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLog record(User actor, String action, String targetType, Long targetId, Long channelId, String details) {
        Long actorId = actor != null ? actor.getId() : null;
        return auditLogRepository.save(new AuditLog(actorId, action, targetType, targetId, channelId, details));
    }
}

package com.messenger.repository;

import com.messenger.model.UserBan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface UserBanRepository extends JpaRepository<UserBan, Long> {
    @Query("""
            select count(ub) > 0
            from UserBan ub
            where ub.userId = :userId
              and ub.revokedAt is null
              and (ub.expiresAt is null or ub.expiresAt > CURRENT_TIMESTAMP)
              and (ub.scopeChannelId is null or ub.scopeChannelId = :channelId)
            """)
    boolean hasActiveBan(Long userId, Long channelId);
}

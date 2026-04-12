package com.messenger.repository;

import com.messenger.model.MessageFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageFileRepository extends JpaRepository<MessageFile, Long> {
    @Query("""
            SELECT (COUNT(mf) > 0)
            FROM MessageFile mf
            WHERE mf.fileId = :fileId
              AND EXISTS (
                SELECT uc.id
                FROM UserChat uc
                WHERE uc.chatId = mf.message.chat.id
                  AND uc.userId = :userId
              )
            """)
    boolean existsFileInUserChats(@Param("fileId") Long fileId, @Param("userId") Long userId);
}

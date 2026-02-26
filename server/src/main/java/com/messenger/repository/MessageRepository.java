package com.messenger.repository;

import com.messenger.model.Message;
import com.messenger.model.enums.MessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChat_IdOrderByCreatedAtAsc(Long chatId);

    List<Message> findByChat_IdAndStatus(Long chatId, MessageStatus status);

    /**
     * Удаляет сообщения, созданные до указанной даты
     * Deletes messages created before the specified date
     *
     * @param beforeDate Дата, до которой удалять сообщения / Date before which to
     *                   delete messages
     * @return Количество удаленных сообщений / Number of deleted messages
     */
    int deleteByCreatedAtBefore(java.time.LocalDateTime beforeDate);
}
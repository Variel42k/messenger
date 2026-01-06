package com.messenger.repository;

import com.messenger.model.Message;
import com.messenger.model.enums.MessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChatIdOrderByCreatedAtAsc(Long chatId);
    List<Message> findByChatIdAndStatus(Long chatId, MessageStatus status);
}
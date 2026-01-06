package com.messenger.repository;

import com.messenger.model.UserChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserChatRepository extends JpaRepository<UserChat, Long> {
    List<UserChat> findByUserId(Long userId);
    List<UserChat> findByChatId(Long chatId);
}
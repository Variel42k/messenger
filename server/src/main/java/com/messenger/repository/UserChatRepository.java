package com.messenger.repository;

import com.messenger.model.UserChat;
import com.messenger.model.enums.ChatRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserChatRepository extends JpaRepository<UserChat, Long> {
    List<UserChat> findByUserId(Long userId);
    List<UserChat> findByChatId(Long chatId);
    Optional<UserChat> findByChatIdAndUserId(Long chatId, Long userId);
    boolean existsByChatIdAndUserId(Long chatId, Long userId);
    List<UserChat> findByChatIdAndRole(Long chatId, ChatRole role);
}

package com.messenger.repository;

import com.messenger.model.Chat;
import com.messenger.model.enums.ChatType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRepository extends JpaRepository<Chat, Long> {
    List<Chat> findByTypeAndDeletedAtIsNull(ChatType type);

    List<Chat> findByParentGroupIdAndTypeAndDeletedAtIsNull(Long parentGroupId, ChatType type);
}

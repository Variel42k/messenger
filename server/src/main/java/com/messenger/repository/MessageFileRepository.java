package com.messenger.repository;

import com.messenger.model.MessageFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageFileRepository extends JpaRepository<MessageFile, Long> {
}
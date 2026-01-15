package com.messenger.controller;

import com.messenger.model.File;
import com.messenger.model.Message;
import com.messenger.model.MessageFile;
import com.messenger.repository.MessageFileRepository;
import com.messenger.service.FileService;
import com.messenger.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Контроллер для управления сообщениями
 * Обрабатывает получение и отправку сообщений
 */
@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;
    private final FileService fileService;
    private final MessageFileRepository messageFileRepository;

    public MessageController(MessageService messageService, FileService fileService, MessageFileRepository messageFileRepository) {
        this.messageService = messageService;
        this.fileService = fileService;
        this.messageFileRepository = messageFileRepository;
    }

    /**
     * Получение сообщений для указанного чата
     * @param chatId Идентификатор чата
     * @return Список сообщений в чате
     */
    @GetMapping("/{chatId}")
    public List<Message> getChatMessages(@PathVariable Long chatId) {
        return messageService.getChatMessages(chatId);
    }

    /**
     * Отправка нового сообщения
     * @param message Объект сообщения для отправки
     * @return Ответ с сохраненным сообщением или ошибку
     */
    @PostMapping
    public ResponseEntity<Message> sendMessage(@RequestBody Message message) {
        Message savedMessage = messageService.saveMessage(message);
        if (savedMessage != null) {
            return ResponseEntity.ok(savedMessage);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Отправка сообщения с файлом
     * @param message Объект сообщения
     * @param file Файл для прикрепления к сообщению
     * @param senderId ID отправителя
     * @param chatId ID чата
     * @return Ответ с сохраненным сообщением
     */
    @PostMapping("/with-file")
    public ResponseEntity<Message> sendMessageWithFile(
            @RequestParam("chatId") Long chatId,
            @RequestParam("senderId") Long senderId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            File attachedFile = null;
            if (file != null && !file.isEmpty()) {
                attachedFile = fileService.saveFile(file, senderId);
            }

            // Создаем сообщение с использованием сервиса, который работает с ID
            Message savedMessage = messageService.createMessage(chatId, senderId, content != null ? content : "");

            // Если есть файл, создаем связь
            if (attachedFile != null) {
                MessageFile messageFile = new MessageFile();
                messageFile.setMessageId(savedMessage.getId());
                messageFile.setFileId(attachedFile.getId());
                // Сохраняем связь между сообщением и файлом
                messageFileRepository.save(messageFile);
            }

            return ResponseEntity.ok(savedMessage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Создание сообщения с использованием ID чата и отправителя
     */
    @PostMapping("/create")
    public ResponseEntity<Message> createMessage(
            @RequestParam("chatId") Long chatId,
            @RequestParam("senderId") Long senderId,
            @RequestParam("content") String content) {
        try {
            Message message = messageService.createMessage(chatId, senderId, content);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
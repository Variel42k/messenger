package com.messenger.controller;

import com.messenger.model.Message;
import com.messenger.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Контроллер для управления сообщениями
 * Обрабатывает получение и отправку сообщений
 */
@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
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
}
package com.messenger.controller;

import com.messenger.model.Chat;
import com.messenger.model.enums.ChatType;
import com.messenger.model.enums.ChatRole;
import com.messenger.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Контроллер для управления чатами
 * Обрабатывает получение, создание чатов и добавление участников
 */
@RestController
@RequestMapping("/api/chats")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * Получение списка чатов для указанного пользователя
     * @param userId Идентификатор пользователя
     * @return Список чатов пользователя
     */
    @GetMapping
    public List<Chat> getUserChats(@RequestParam Long userId) {
        return chatService.getUserChats(userId);
    }

    /**
     * Создание нового чата
     * @param request Запрос с параметрами создания чата
     * @param createdById Идентификатор пользователя, создающего чат
     * @return Ответ с созданным чатом или ошибкой
     */
    @PostMapping
    public ResponseEntity<Chat> createChat(@RequestBody CreateChatRequest request,
                                           @RequestParam Long createdById) {
        Chat chat = chatService.createChat(request.getName(), request.getType(), request.getEncrypted(), request.getEncryptionKey(), createdById);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Получение чата по идентификатору
     * @param chatId Идентификатор чата
     * @return Ответ с чатом или ошибкой 404
     */
    @GetMapping("/{chatId}")
    public ResponseEntity<Chat> getChatById(@PathVariable Long chatId) {
        Optional<Chat> chat = chatService.getChatById(chatId);
        if (chat.isPresent()) {
            return ResponseEntity.ok(chat.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Добавление участника в чат
     * @param chatId Идентификатор чата
     * @param userId Идентификатор пользователя для добавления
     * @param role Роль пользователя в чате
     * @return Ответ с обновленным чатом или ошибкой
     */
    @PostMapping("/{chatId}/members")
    public ResponseEntity<Chat> addMemberToChat(@PathVariable Long chatId,
                                                @RequestParam Long userId,
                                                @RequestParam String role) {
        Chat chat = chatService.addMemberToChat(chatId, userId,
                ChatRole.valueOf(role.toUpperCase()));
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}

/**
 * DTO для запроса создания чата
 */
class CreateChatRequest {
    private String name;    // Название чата
    private ChatType type;  // Тип чата
    private Boolean encrypted; // Флаг шифрования чата
    private String encryptionKey; // Ключ шифрования

    // Геттеры и сеттеры
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ChatType getType() { return type; }
    public void setType(ChatType type) { this.type = type; }

    public Boolean getEncrypted() { return encrypted != null ? encrypted : false; }
    public void setEncrypted(Boolean encrypted) { this.encrypted = encrypted; }

    public String getEncryptionKey() { return encryptionKey; }
    public void setEncryptionKey(String encryptionKey) { this.encryptionKey = encryptionKey; }
}
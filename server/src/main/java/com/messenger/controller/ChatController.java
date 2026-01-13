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
        Chat chat = chatService.createChat(request.getName(), request.getType(), request.getEncrypted(), request.getEncryptionKey(), request.getEncryptionAlgorithm(), request.getSecurityLevel(), createdById);
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

    /**
     * Удаление участника из чата
     * @param chatId Идентификатор чата
     * @param userId Идентификатор пользователя для удаления
     * @return Ответ с обновленным чатом или ошибкой
     */
    @DeleteMapping("/{chatId}/members/{userId}")
    public ResponseEntity<Chat> removeMemberFromChat(@PathVariable Long chatId,
                                                     @PathVariable Long userId) {
        Chat chat = chatService.removeMemberFromChat(chatId, userId);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Обновление типа чата
     * @param chatId Идентификатор чата
     * @param newType Новый тип чата
     * @return Ответ с обновленным чатом или ошибкой
     */
    @PutMapping("/{chatId}/type")
    public ResponseEntity<Chat> updateChatType(@PathVariable Long chatId,
                                               @RequestParam ChatType newType) {
        Chat chat = chatService.updateChatType(chatId, newType);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Обновление параметров шифрования чата
     * @param chatId Идентификатор чата
     * @param encrypted Флаг включения шифрования
     * @param encryptionAlgorithm Алгоритм шифрования
     * @param securityLevel Уровень безопасности
     * @return Ответ с обновленным чатом или ошибкой
     */
    @PutMapping("/{chatId}/encryption")
    public ResponseEntity<Chat> updateChatEncryption(@PathVariable Long chatId,
                                                     @RequestParam(required = false) Boolean encrypted,
                                                     @RequestParam(required = false) String encryptionAlgorithm,
                                                     @RequestParam(required = false) String securityLevel) {
        Chat chat = chatService.updateChatEncryption(chatId, encrypted, encryptionAlgorithm, securityLevel);
        if (chat != null) {
            return ResponseEntity.ok(chat);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Назначение модератора чата
     * @param chatId Идентификатор чата
     * @param userId Идентификатор пользователя для назначения модератором
     * @return Ответ с обновленным чатом или ошибкой
     */
    @PutMapping("/{chatId}/moderator")
    public ResponseEntity<Chat> setModerator(@PathVariable Long chatId,
                                             @RequestParam Long userId) {
        Chat chat = chatService.setModerator(chatId, userId);
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
    private String encryptionAlgorithm; // Алгоритм шифрования
    private String securityLevel; // Уровень безопасности

    // Геттеры и сеттеры
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ChatType getType() { return type; }
    public void setType(ChatType type) { this.type = type; }

    public Boolean getEncrypted() { return encrypted != null ? encrypted : false; }
    public void setEncrypted(Boolean encrypted) { this.encrypted = encrypted; }

    public String getEncryptionKey() { return encryptionKey; }
    public void setEncryptionKey(String encryptionKey) { this.encryptionKey = encryptionKey; }

    public String getEncryptionAlgorithm() { return encryptionAlgorithm; }
    public void setEncryptionAlgorithm(String encryptionAlgorithm) { this.encryptionAlgorithm = encryptionAlgorithm; }

    public String getSecurityLevel() { return securityLevel; }
    public void setSecurityLevel(String securityLevel) { this.securityLevel = securityLevel; }
}
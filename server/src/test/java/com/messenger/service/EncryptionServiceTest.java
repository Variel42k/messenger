package com.messenger.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

public class EncryptionServiceTest {

    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptionService();
    }

    @Test
    void testKeyGeneration() {
        String key1 = encryptionService.generateKey();
        String key2 = encryptionService.generateKey();
        
        assertNotNull(key1);
        assertNotNull(key2);
        assertNotEquals(key1, key2); // Каждый ключ должен быть уникальным
        assertTrue(key1.length() > 0);
        assertTrue(key2.length() > 0);
    }

    @Test
    void testEncryptionDecryption() {
        String originalText = "This is a test message for encryption.";
        String key = encryptionService.generateKey();
        
        String encryptedText = encryptionService.encrypt(originalText, key);
        String decryptedText = encryptionService.decrypt(encryptedText, key);
        
        assertNotEquals(originalText, encryptedText); // Зашифрованный текст должен отличаться
        assertEquals(originalText, decryptedText); // Расшифрованный текст должен совпадать с оригиналом
    }

    @Test
    void testInvalidKey() {
        String originalText = "Test message";
        String invalidKey = "invalid_key";
        
        assertFalse(encryptionService.isValidKey(invalidKey));
    }

    @Test
    void testValidKey() {
        String validKey = encryptionService.generateKey();
        
        assertTrue(encryptionService.isValidKey(validKey));
    }

    @Test
    void testEncryptionWithInvalidKey() {
        String originalText = "Test message";
        String invalidKey = "invalid_key";
        
        assertThrows(RuntimeException.class, () -> {
            encryptionService.encrypt(originalText, invalidKey);
        });
    }

    @Test
    void testDecryptionWithInvalidKey() {
        String originalText = "Test message";
        String key = encryptionService.generateKey();
        String encryptedText = encryptionService.encrypt(originalText, key);
        String invalidKey = "invalid_key";
        
        assertThrows(RuntimeException.class, () -> {
            encryptionService.decrypt(encryptedText, invalidKey);
        });
    }
}
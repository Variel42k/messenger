package com.messenger.service;

import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Сервис для работы с шифрованием
 * Обеспечивает генерацию ключей, шифрование и дешифрование сообщений
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    /**
     * Генерация нового ключа шифрования
     * @return строковое представление ключа в формате Base64
     */
    public String generateKey() {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance(ALGORITHM);
            keyGen.init(256); // 256-битный ключ
            SecretKey secretKey = keyGen.generateKey();
            return Base64.getEncoder().encodeToString(secretKey.getEncoded());
        } catch (Exception e) {
            throw new RuntimeException("Ошибка при генерации ключа шифрования", e);
        }
    }

    /**
     * Шифрование текста с использованием ключа
     * @param plainText текст для шифрования
     * @param key ключ шифрования в формате Base64
     * @return зашифрованный текст в формате Base64
     */
    public String encrypt(String plainText, String key) {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(key);
            SecretKey originalKey = new SecretKeySpec(decodedKey, 0, decodedKey.length, ALGORITHM);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, originalKey);
            
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes("UTF-8"));
            // Сохраняем также IV (инициализационный вектор) вместе с зашифрованными данными
            byte[] iv = cipher.getIV();
            
            // Объединяем IV и зашифрованные данные
            byte[] result = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, result, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, result, iv.length, encryptedBytes.length);
            
            return Base64.getEncoder().encodeToString(result);
        } catch (Exception e) {
            throw new RuntimeException("Ошибка при шифровании сообщения", e);
        }
    }

    /**
     * Дешифрование текста с использованием ключа
     * @param encryptedText зашифрованный текст в формате Base64
     * @param key ключ шифрования в формате Base64
     * @return расшифрованный текст
     */
    public String decrypt(String encryptedText, String key) {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(key);
            SecretKey originalKey = new SecretKeySpec(decodedKey, 0, decodedKey.length, ALGORITHM);

            byte[] combinedData = Base64.getDecoder().decode(encryptedText);
            
            // Извлекаем IV (первые 12 байт для GCM)
            int ivLength = 12; // длина IV для GCM
            byte[] iv = new byte[ivLength];
            System.arraycopy(combinedData, 0, iv, 0, ivLength);
            
            // Извлекаем зашифрованные данные
            byte[] encryptedData = new byte[combinedData.length - ivLength];
            System.arraycopy(combinedData, ivLength, encryptedData, 0, encryptedData.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, originalKey, new javax.crypto.spec.IvParameterSpec(iv));
            
            byte[] decryptedBytes = cipher.doFinal(encryptedData);
            return new String(decryptedBytes, "UTF-8");
        } catch (Exception e) {
            throw new RuntimeException("Ошибка при дешифровании сообщения", e);
        }
    }

    /**
     * Проверяет, является ли ключ действительным
     * @param key ключ в формате Base64
     * @return true, если ключ действителен
     */
    public boolean isValidKey(String key) {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(key);
            // Простая проверка длины ключа AES (128, 192 или 256 бит)
            return decodedKey.length == 16 || decodedKey.length == 24 || decodedKey.length == 32;
        } catch (Exception e) {
            return false;
        }
    }
}
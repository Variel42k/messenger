package com.messenger.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for generating and validating TOTP codes compatible with authenticator apps.
 */
@Service
public class TotpService {

    private static final char[] BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();
    private static final Map<Character, Integer> BASE32_DECODE_MAP = createDecodeMap();
    private static final int SECRET_SIZE_BYTES = 20;
    private static final int CODE_DIGITS = 6;
    private static final long TIME_STEP_SECONDS = 30L;
    private static final int ALLOWED_TIME_WINDOWS = 1;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.two-factor.issuer:Messenger}")
    private String issuer;

    public String generateSecret() {
        byte[] randomBytes = new byte[SECRET_SIZE_BYTES];
        secureRandom.nextBytes(randomBytes);
        return encodeBase32(randomBytes);
    }

    public boolean verifyCode(String secret, String code) {
        return verifyCode(secret, code, Instant.now());
    }

    boolean verifyCode(String secret, String code, Instant instant) {
        if (secret == null || secret.isBlank() || code == null) {
            return false;
        }

        String normalizedCode = code.replace(" ", "").trim();
        if (!normalizedCode.matches("\\d{" + CODE_DIGITS + "}")) {
            return false;
        }

        long currentCounter = instant.getEpochSecond() / TIME_STEP_SECONDS;
        for (long offset = -ALLOWED_TIME_WINDOWS; offset <= ALLOWED_TIME_WINDOWS; offset++) {
            if (generateCode(secret, currentCounter + offset).equals(normalizedCode)) {
                return true;
            }
        }

        return false;
    }

    String generateCode(String secret, Instant instant) {
        return generateCode(secret, instant.getEpochSecond() / TIME_STEP_SECONDS);
    }

    public String buildOtpAuthUri(String username, String secret) {
        String encodedLabel = urlEncode(issuer + ":" + username);
        return "otpauth://totp/" + encodedLabel
                + "?secret=" + urlEncode(secret)
                + "&issuer=" + urlEncode(issuer)
                + "&algorithm=SHA1&digits=" + CODE_DIGITS
                + "&period=" + TIME_STEP_SECONDS;
    }

    public String getIssuer() {
        return issuer;
    }

    private String generateCode(String secret, long counter) {
        try {
            byte[] secretBytes = decodeBase32(secret);
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA1"));

            byte[] counterBytes = ByteBuffer.allocate(8).putLong(counter).array();
            byte[] hash = mac.doFinal(counterBytes);
            int offset = hash[hash.length - 1] & 0x0F;

            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            int otp = binary % (int) Math.pow(10, CODE_DIGITS);
            return String.format("%0" + CODE_DIGITS + "d", otp);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to generate TOTP code", e);
        }
    }

    private static Map<Character, Integer> createDecodeMap() {
        Map<Character, Integer> map = new HashMap<>();
        for (int i = 0; i < BASE32_ALPHABET.length; i++) {
            map.put(BASE32_ALPHABET[i], i);
        }
        return map;
    }

    private String encodeBase32(byte[] data) {
        StringBuilder encoded = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bitsLeft = 0;

        for (byte value : data) {
            buffer = (buffer << 8) | (value & 0xFF);
            bitsLeft += 8;

            while (bitsLeft >= 5) {
                encoded.append(BASE32_ALPHABET[(buffer >> (bitsLeft - 5)) & 0x1F]);
                bitsLeft -= 5;
            }
        }

        if (bitsLeft > 0) {
            encoded.append(BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 0x1F]);
        }

        return encoded.toString();
    }

    private byte[] decodeBase32(String input) {
        String normalized = input.replace("=", "")
                .replace(" ", "")
                .replace("-", "")
                .toUpperCase();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int buffer = 0;
        int bitsLeft = 0;

        for (char current : normalized.toCharArray()) {
            Integer value = BASE32_DECODE_MAP.get(current);
            if (value == null) {
                throw new IllegalArgumentException("Invalid Base32 character: " + current);
            }

            buffer = (buffer << 5) | value;
            bitsLeft += 5;

            if (bitsLeft >= 8) {
                output.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }

        return output.toByteArray();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

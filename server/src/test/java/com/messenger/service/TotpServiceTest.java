package com.messenger.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TotpServiceTest {

    private TotpService totpService;

    @BeforeEach
    void setUp() {
        totpService = new TotpService();
        ReflectionTestUtils.setField(totpService, "issuer", "Messenger");
    }

    @Test
    void generatedCodeShouldValidateWithinSameTimeWindow() {
        String secret = totpService.generateSecret();
        Instant instant = Instant.parse("2026-03-17T10:15:30Z");

        String code = totpService.generateCode(secret, instant);

        assertTrue(totpService.verifyCode(secret, code, instant));
    }

    @Test
    void invalidCodeShouldBeRejected() {
        String secret = totpService.generateSecret();

        assertFalse(totpService.verifyCode(secret, "123456", Instant.parse("2026-03-17T10:15:30Z")));
    }

    @Test
    void shouldBuildOtpAuthUriForAuthenticatorApps() {
        String secret = totpService.generateSecret();

        String otpauthUrl = totpService.buildOtpAuthUri("alice", secret);

        assertTrue(otpauthUrl.startsWith("otpauth://totp/"));
        assertTrue(otpauthUrl.contains("secret=" + secret));
        assertTrue(otpauthUrl.contains("issuer=Messenger"));
    }
}

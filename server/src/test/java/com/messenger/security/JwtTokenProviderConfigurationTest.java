package com.messenger.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtTokenProviderConfigurationTest {

    private static final String DEVELOPMENT_SECRET = "mySecretKeyForDevelopmentOnlyMustBe256Bits!!";
    private static final String TEST_SECRET = "testSecretKeyForTestingOnlyMustBe256Bits!!";
    private static final String STRONG_PRODUCTION_SECRET =
            "productionSecretGeneratedForJwtSigningOnlyAndLongEnoughForHs256";

    @Test
    void developmentSecretShouldBeAllowedOutsideProduction() {
        JwtTokenProvider provider = providerWithSecret(DEVELOPMENT_SECRET, "dev");

        assertDoesNotThrow(provider::validateConfiguration);
    }

    @Test
    void testSecretShouldBeAllowedOutsideProduction() {
        JwtTokenProvider provider = providerWithSecret(TEST_SECRET, "test");

        assertDoesNotThrow(provider::validateConfiguration);
    }

    @Test
    void developmentSecretShouldBeRejectedInProduction() {
        JwtTokenProvider provider = providerWithSecret(DEVELOPMENT_SECRET, "prod");

        assertThrows(IllegalStateException.class, provider::validateConfiguration);
    }

    @Test
    void testSecretShouldBeRejectedInProduction() {
        JwtTokenProvider provider = providerWithSecret(TEST_SECRET, "prod");

        assertThrows(IllegalStateException.class, provider::validateConfiguration);
    }

    @Test
    void strongSecretShouldBeAllowedInProduction() {
        JwtTokenProvider provider = providerWithSecret(STRONG_PRODUCTION_SECRET, "prod");

        assertDoesNotThrow(provider::validateConfiguration);
    }

    @Test
    void blankSecretShouldBeRejected() {
        JwtTokenProvider provider = providerWithSecret(" ", "dev");

        assertThrows(IllegalStateException.class, provider::validateConfiguration);
    }

    @Test
    void shortSecretShouldBeRejected() {
        JwtTokenProvider provider = providerWithSecret("short-secret", "dev");

        assertThrows(IllegalStateException.class, provider::validateConfiguration);
    }

    private JwtTokenProvider providerWithSecret(String jwtSecret, String... activeProfiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(activeProfiles);

        JwtTokenProvider provider = new JwtTokenProvider(environment);
        ReflectionTestUtils.setField(provider, "jwtSecret", jwtSecret);
        return provider;
    }
}

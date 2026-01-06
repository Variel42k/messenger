package com.messenger.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Конфигурация для 7-го контекста приложения (context7)
 * Эта конфигурация активируется при использовании профиля "context7"
 */
@Configuration
@Profile("context7")
public class Context7Config {

    /**
     * Бин для 7-го контекста - может представлять собой специфичную логику для этого контекста
     * @return Объект, представляющий специфичную логику 7-го контекста
     */
    @Bean("context7Bean")
    public String context7Bean() {
        return "This is the 7th context configuration";
    }

    /**
     * Пример дополнительной настройки для 7-го контекста
     * @return Объект настройки для 7-го контекста
     */
    @Bean
    public Context7Properties context7Properties() {
        Context7Properties properties = new Context7Properties();
        properties.setContextId(7);
        properties.setContextName("context7");
        properties.setEnabled(true);
        return properties;
    }

    /**
     * Класс для хранения свойств 7-го контекста
     */
    public static class Context7Properties {
        private int contextId;
        private String contextName;
        private boolean enabled;

        public int getContextId() {
            return contextId;
        }

        public void setContextId(int contextId) {
            this.contextId = contextId;
        }

        public String getContextName() {
            return contextName;
        }

        public void setContextName(String contextName) {
            this.contextName = contextName;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}
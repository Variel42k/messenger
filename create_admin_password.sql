-- Скрипт для создания хешированного пароля администратора
-- Используемый пароль: 'admin123'

-- Пароль 'admin123' захеширован с помощью bcrypt
INSERT INTO users (username, email, password_hash, first_name, last_name, role, created_at) 
VALUES ('admin', 'admin@messenger.local', '$2a$10$9mxTxAkC4yYwUW0a7M6vkuOaEwDh6qdm6v6xU8o0O54.WyU4z7vUW', 'Admin', 'User', 'ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Добавляем настройки для администратора
INSERT INTO user_settings (user_id) 
SELECT id FROM users WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;
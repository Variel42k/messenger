-- Добавление стандартного пользователя администратора
-- Логин: admin
-- Пароль: admin123

-- Создание администратора с хешированным паролем (bcrypt хеш для 'admin123')
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, created_at, updated_at) 
VALUES ('admin', 'admin@messenger.local', '$2a$10$4NB8Nyqtpsqn1U/MQXAXNeoem.RgGsUAI5gwlmFyQiPQ3KQlmtEkW', 'Admin', 'User', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Добавляем настройки для администратора, если они еще не существуют
INSERT INTO user_settings (user_id, theme, language, notification_enabled, email_notification_enabled, created_at, updated_at) 
SELECT id, 'LIGHT', 'en', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM users 
WHERE username = 'admin' 
AND NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;
-- Ensure the default admin account uses BCrypt hash.
-- Older installations may have a plain-text value from legacy migration history.

UPDATE users
SET password_hash = '$2a$10$4NB8Nyqtpsqn1U/MQXAXNeoem.RgGsUAI5gwlmFyQiPQ3KQlmtEkW',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin'
  AND (password_hash IS NULL OR password_hash NOT LIKE '$2%');

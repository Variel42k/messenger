-- Fix invalid BCrypt value for default admin account if legacy data has malformed hash.

UPDATE users
SET password_hash = '$2a$10$4NB8Nyqtpsqn1U/MQXAXNeoem.RgGsUAI5gwlmFyQiPQ3KQlmtEkW',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin'
  AND (
    password_hash IS NULL
    OR length(password_hash) <> 60
    OR password_hash !~ '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$'
  );

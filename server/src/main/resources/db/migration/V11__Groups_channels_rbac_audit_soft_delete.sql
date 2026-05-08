ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS gdpr_purged_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_active
    ON users (lower(username))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_active
    ON users (lower(email))
    WHERE deleted_at IS NULL;

ALTER TABLE chats
    ADD COLUMN IF NOT EXISTS parent_group_id BIGINT REFERENCES chats(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_readonly BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_chats_parent_group_id ON chats(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_chats_deleted_at ON chats(deleted_at);

ALTER TABLE chat_members
    ADD COLUMN IF NOT EXISTS state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_chat_members_state ON chat_members(state);
CREATE INDEX IF NOT EXISTS idx_chat_members_active_user ON chat_members(user_id, chat_id)
    WHERE state = 'ACTIVE' AND left_at IS NULL;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS client_msg_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;

DO $$
DECLARE
    fk_name TEXT;
BEGIN
    SELECT tc.constraint_name
    INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'messages'
      AND kcu.column_name = 'sender_id'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

ALTER TABLE messages
    ADD CONSTRAINT fk_messages_sender_id
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_messages_client_msg_id
    ON messages(chat_id, sender_id, client_msg_id)
    WHERE client_msg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);

CREATE TABLE IF NOT EXISTS user_bans (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope_channel_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
    banned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_scope_channel_id ON user_bans(scope_channel_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active
    ON user_bans(user_id, scope_channel_id)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id BIGINT,
    channel_id BIGINT REFERENCES chats(id) ON DELETE SET NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_channel ON audit_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS ws_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(160) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ws_sessions_active
    ON ws_sessions(session_id)
    WHERE disconnected_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ws_sessions_user_active
    ON ws_sessions(user_id)
    WHERE disconnected_at IS NULL;

CREATE OR REPLACE VIEW groups AS
    SELECT id, name, description, created_by, created_at, updated_at, deleted_at
    FROM chats
    WHERE type = 'GROUP';

CREATE OR REPLACE VIEW channels AS
    SELECT id, parent_group_id AS group_id, name, description, is_readonly, created_by, created_at, updated_at, deleted_at
    FROM chats
    WHERE type = 'CHANNEL';

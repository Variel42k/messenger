-- Rollback for V11. Run only after taking a database backup.
-- This removes the additive production-grade group/channel support tables and columns.

DROP VIEW IF EXISTS channels;
DROP VIEW IF EXISTS groups;

DROP TABLE IF EXISTS ws_sessions;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS user_bans;

DROP INDEX IF EXISTS ux_messages_client_msg_id;
DROP INDEX IF EXISTS idx_messages_deleted_at;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_sender_id;
ALTER TABLE messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES users(id);

ALTER TABLE messages
    DROP COLUMN IF EXISTS client_msg_id,
    DROP COLUMN IF EXISTS edited_at,
    DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_chat_members_active_user;
DROP INDEX IF EXISTS idx_chat_members_state;
ALTER TABLE chat_members DROP COLUMN IF EXISTS state;

DROP INDEX IF EXISTS idx_chats_parent_group_id;
DROP INDEX IF EXISTS idx_chats_deleted_at;
ALTER TABLE chats
    DROP COLUMN IF EXISTS parent_group_id,
    DROP COLUMN IF EXISTS is_readonly,
    DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS ux_users_username_active;
DROP INDEX IF EXISTS ux_users_email_active;

ALTER TABLE users
    DROP COLUMN IF EXISTS deactivated_at,
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS gdpr_purged_at;

ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

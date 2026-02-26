-- Add encryption fields to chats table if they don't already exist
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS encryption_key VARCHAR(255);
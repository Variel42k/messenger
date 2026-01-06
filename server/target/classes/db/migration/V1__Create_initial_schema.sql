-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    role VARCHAR(20) DEFAULT 'USER',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Create chats table
CREATE TABLE chats (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'PRIVATE', -- PRIVATE, GROUP, CHANNEL
    avatar_url VARCHAR(255),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for chats table
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_created_by ON chats(created_by);

-- Create chat_members table
CREATE TABLE chat_members (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER', -- MEMBER, ADMIN, OWNER
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(chat_id, user_id)
);

-- Create indexes for chat_members table
CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_members_role ON chat_members(role);

-- Create messages table
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id),
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'TEXT', -- TEXT, IMAGE, FILE, SYSTEM
    reply_to_message_id BIGINT REFERENCES messages(id),
    status VARCHAR(20) DEFAULT 'SENT', -- SENT, DELIVERED, READ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for messages table
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);

-- Create partitioned messages table for better performance
-- This creates monthly partitions for historical messages
CREATE TABLE messages_partitioned (
    id BIGSERIAL,
    chat_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'TEXT',
    reply_to_message_id BIGINT,
    status VARCHAR(20) DEFAULT 'SENT',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partition for current month (this would be created dynamically)
CREATE TABLE messages_2026_01 PARTITION OF messages_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Create indexes for partitioned messages table
CREATE INDEX idx_messages_partitioned_chat_id ON messages_partitioned(chat_id);
CREATE INDEX idx_messages_partitioned_sender_id ON messages_partitioned(sender_id);
CREATE INDEX idx_messages_partitioned_created_at ON messages_partitioned(created_at);

-- Create files table
CREATE TABLE files (
    id BIGSERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size BIGINT NOT NULL,
    bucket_name VARCHAR(100) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    uploaded_by BIGINT REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for files table
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at);

-- Create message_files table (for messages with file attachments)
CREATE TABLE message_files (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_id BIGINT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(message_id, file_id)
);

-- Create indexes for message_files table
CREATE INDEX idx_message_files_message_id ON message_files(message_id);
CREATE INDEX idx_message_files_file_id ON message_files(file_id);

-- Create user_settings table
CREATE TABLE user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'LIGHT',
    language VARCHAR(10) DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notification_enabled BOOLEAN DEFAULT FALSE,
    last_seen_online TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_settings table
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Create delivery receipts table (for tracking message read status)
CREATE TABLE delivery_receipts (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    recipient_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL, -- SENT, DELIVERED, READ
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(message_id, recipient_id)
);

-- Create indexes for delivery_receipts table
CREATE INDEX idx_delivery_receipts_message_id ON delivery_receipts(message_id);
CREATE INDEX idx_delivery_receipts_recipient_id ON delivery_receipts(recipient_id);
CREATE INDEX idx_delivery_receipts_status ON delivery_receipts(status);

-- Create refresh_tokens table (for JWT refresh token storage)
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for refresh_tokens table
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens(expiry_date);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Insert default admin user
INSERT INTO users (username, email, password_hash, first_name, last_name, role, created_at) 
VALUES ('admin', 'admin@messenger.local', '$2a$10$DowD8FvN0aQ3Ck6q1QqZ0Oy4p9K6p9K6p9K6p', 'Admin', 'User', 'ADMIN', CURRENT_TIMESTAMP);

-- Insert default user settings for admin
INSERT INTO user_settings (user_id) VALUES (1);
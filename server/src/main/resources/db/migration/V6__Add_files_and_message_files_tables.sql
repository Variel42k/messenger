-- Создание таблицы для хранения информации о файлах
CREATE TABLE files (
    id BIGSERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(255),
    size BIGINT,
    bucket_name VARCHAR(255),
    object_key VARCHAR(255),
    uploaded_by BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Создание таблицы для связи файлов и сообщений
CREATE TABLE message_files (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    file_id BIGINT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Добавление индексов для повышения производительности
CREATE INDEX idx_message_files_message_id ON message_files(message_id);
CREATE INDEX idx_message_files_file_id ON message_files(file_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at);
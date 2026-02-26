-- Init script for PostgreSQL container
-- Flyway will handle schema migrations, this file ensures the database exists
-- and sets up any required extensions

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

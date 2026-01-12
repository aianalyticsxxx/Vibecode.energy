-- Add presence tracking to users
ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_users_last_active ON users(last_active_at);

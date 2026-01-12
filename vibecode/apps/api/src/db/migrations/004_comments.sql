-- Comments table for vibe discussions
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vibe_id UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(280) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_vibe ON comments(vibe_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);

-- BeReal-style features: VibeCheck, Streaks, Photo Reactions

-- Daily VibeCheck times table
-- Stores the random time each day when users should post
CREATE TABLE daily_vibechecks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vibecheck_date DATE UNIQUE NOT NULL,
    trigger_time TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_daily_vibechecks_date ON daily_vibechecks(vibecheck_date DESC);

-- Add vibecheck tracking to vibes table
ALTER TABLE vibes
ADD COLUMN vibecheck_id UUID REFERENCES daily_vibechecks(id),
ADD COLUMN is_late BOOLEAN DEFAULT false,
ADD COLUMN late_by_minutes INTEGER DEFAULT 0;

-- User streaks table
-- Tracks consecutive days of posting
CREATE TABLE user_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_post_date DATE,
    streak_started_at DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_streaks_current ON user_streaks(current_streak DESC);

-- Extend reactions table for selfie reactions (RealMoji style)
ALTER TABLE reactions
ADD COLUMN reaction_type VARCHAR(20) DEFAULT 'sparkle',
ADD COLUMN image_url TEXT,
ADD COLUMN image_key VARCHAR(255);

-- Update unique constraint to allow multiple reaction types per user per vibe
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS unique_user_reaction_per_vibe;
ALTER TABLE reactions ADD CONSTRAINT unique_user_reaction_type_per_vibe
    UNIQUE (vibe_id, user_id, reaction_type);

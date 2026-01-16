-- AI Content Moderation System
-- Adds automated content scanning with OpenAI Vision API

-- ============================================================================
-- STEP 1: Add moderation fields to shots table
-- ============================================================================
ALTER TABLE shots ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE shots ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

-- Add check constraint for valid moderation status values
ALTER TABLE shots ADD CONSTRAINT valid_moderation_status CHECK (
    moderation_status IN ('pending', 'approved', 'flagged', 'rejected', 'manual_review')
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_shots_moderation_status ON shots(moderation_status);
CREATE INDEX IF NOT EXISTS idx_shots_hidden ON shots(is_hidden) WHERE is_hidden = TRUE;

-- ============================================================================
-- STEP 2: Create moderation_results table (AI analysis audit trail)
-- ============================================================================
CREATE TABLE moderation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,

    -- AI analysis results
    is_safe BOOLEAN NOT NULL,
    overall_confidence DECIMAL(3,2) NOT NULL,

    -- Violation categories with confidence scores (0.00 to 1.00)
    nsfw_score DECIMAL(3,2) DEFAULT 0,
    violence_score DECIMAL(3,2) DEFAULT 0,
    hate_score DECIMAL(3,2) DEFAULT 0,
    harassment_score DECIMAL(3,2) DEFAULT 0,
    self_harm_score DECIMAL(3,2) DEFAULT 0,
    drugs_score DECIMAL(3,2) DEFAULT 0,
    illegal_score DECIMAL(3,2) DEFAULT 0,

    -- Raw response storage for debugging/audit
    raw_response JSONB,
    model_version VARCHAR(50),
    reasoning TEXT,

    -- Processing metadata
    processing_time_ms INTEGER,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT confidence_range CHECK (
        overall_confidence >= 0 AND overall_confidence <= 1
    )
);

CREATE INDEX idx_moderation_results_shot ON moderation_results(shot_id);
CREATE INDEX idx_moderation_results_unsafe ON moderation_results(is_safe) WHERE is_safe = FALSE;
CREATE INDEX idx_moderation_results_created ON moderation_results(created_at DESC);

-- ============================================================================
-- STEP 3: Create moderation_queue table (human review queue)
-- ============================================================================
CREATE TABLE moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    moderation_result_id UUID REFERENCES moderation_results(id) ON DELETE SET NULL,

    -- Queue management
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',

    -- Primary violation that triggered queueing
    trigger_category VARCHAR(30) NOT NULL,
    trigger_confidence DECIMAL(3,2) NOT NULL,

    -- Review tracking
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_decision VARCHAR(20),
    review_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_queue_status CHECK (
        status IN ('pending', 'in_review', 'completed', 'escalated')
    ),
    CONSTRAINT valid_trigger_category CHECK (
        trigger_category IN ('nsfw', 'violence', 'hate', 'harassment', 'self_harm', 'drugs', 'illegal', 'multiple')
    ),
    CONSTRAINT valid_review_decision CHECK (
        review_decision IS NULL OR
        review_decision IN ('approve', 'reject', 'reject_and_ban', 'escalate')
    )
);

CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_priority ON moderation_queue(priority DESC, created_at ASC);
CREATE UNIQUE INDEX idx_moderation_queue_pending_shot ON moderation_queue(shot_id) WHERE status = 'pending';

-- ============================================================================
-- STEP 4: Add documentation comments
-- ============================================================================
COMMENT ON TABLE moderation_results IS 'AI analysis results from OpenAI Vision API for content moderation';
COMMENT ON TABLE moderation_queue IS 'Queue for human review of AI-flagged content';
COMMENT ON COLUMN shots.moderation_status IS 'Content status: pending (not yet analyzed), approved (safe), flagged (queued for review), rejected (hidden), manual_review (needs human check)';
COMMENT ON COLUMN shots.is_hidden IS 'Whether content is hidden from public feeds';
COMMENT ON COLUMN moderation_results.overall_confidence IS 'Highest violation confidence score across all categories';
COMMENT ON COLUMN moderation_queue.priority IS 'Higher values = more urgent review needed';

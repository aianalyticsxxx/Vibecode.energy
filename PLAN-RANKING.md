# Implementation Plan: Global User Ranking System

## Overview

Add a comprehensive user ranking system that:
1. Calculates user scores based on engagement metrics
2. Maintains leaderboards with different time windows
3. Exposes streak leaderboard (already has service method)
4. Displays user rank on profile stats
5. Creates "Top Creators" leaderboard pages

---

## Phase 1: Database Schema

### Migration: `008_user_rankings.sql`

**Location**: `apps/api/src/db/migrations/008_user_rankings.sql`

```sql
-- User ranking system with engagement-based scoring

-- Materialized view for user scores (refreshed periodically)
-- This avoids expensive real-time calculations
CREATE MATERIALIZED VIEW user_scores AS
SELECT
    u.id as user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    -- Core metrics
    COALESCE(vibe_counts.total_vibes, 0) as total_vibes,
    COALESCE(sparkle_counts.sparkles_received, 0) as sparkles_received,
    COALESCE(sparkle_counts.sparkles_given, 0) as sparkles_given,
    COALESCE(comment_counts.comments_received, 0) as comments_received,
    COALESCE(follower_counts.follower_count, 0) as follower_count,
    COALESCE(follower_counts.following_count, 0) as following_count,
    COALESCE(streak_data.current_streak, 0) as current_streak,
    COALESCE(streak_data.longest_streak, 0) as longest_streak,
    -- Weighted score calculation
    -- Formula: (sparkles * 1) + (comments * 3) + (followers * 5) + (streak * 2) + (vibes * 0.5)
    (
        COALESCE(sparkle_counts.sparkles_received, 0) * 1 +
        COALESCE(comment_counts.comments_received, 0) * 3 +
        COALESCE(follower_counts.follower_count, 0) * 5 +
        COALESCE(streak_data.current_streak, 0) * 2 +
        COALESCE(vibe_counts.total_vibes, 0) * 0.5
    )::INTEGER as score
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) as total_vibes
    FROM vibes
    GROUP BY user_id
) vibe_counts ON vibe_counts.user_id = u.id
LEFT JOIN (
    SELECT
        v.user_id,
        COUNT(*) FILTER (WHERE r.user_id != v.user_id) as sparkles_received,
        0 as sparkles_given  -- Calculated separately if needed
    FROM vibes v
    LEFT JOIN reactions r ON r.vibe_id = v.id AND r.type = 'sparkle'
    GROUP BY v.user_id
) sparkle_counts ON sparkle_counts.user_id = u.id
LEFT JOIN (
    SELECT
        v.user_id,
        COUNT(*) FILTER (WHERE c.user_id != v.user_id) as comments_received
    FROM vibes v
    LEFT JOIN comments c ON c.vibe_id = v.id
    GROUP BY v.user_id
) comment_counts ON comment_counts.user_id = u.id
LEFT JOIN (
    SELECT
        followed_id as user_id,
        COUNT(*) as follower_count,
        0 as following_count
    FROM follows
    GROUP BY followed_id
) follower_counts ON follower_counts.user_id = u.id
LEFT JOIN user_streaks streak_data ON streak_data.user_id = u.id;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_user_scores_user_id ON user_scores(user_id);
CREATE INDEX idx_user_scores_score ON user_scores(score DESC);
CREATE INDEX idx_user_scores_sparkles ON user_scores(sparkles_received DESC);
CREATE INDEX idx_user_scores_followers ON user_scores(follower_count DESC);
CREATE INDEX idx_user_scores_streak ON user_scores(current_streak DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_scores()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_scores;
END;
$$ LANGUAGE plpgsql;

-- Weekly rankings snapshot table (for historical tracking)
CREATE TABLE weekly_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    rank INTEGER NOT NULL,
    score INTEGER NOT NULL,
    sparkles_received INTEGER DEFAULT 0,
    vibes_posted INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_week UNIQUE (user_id, week_start)
);

CREATE INDEX idx_weekly_rankings_week ON weekly_rankings(week_start);
CREATE INDEX idx_weekly_rankings_rank ON weekly_rankings(week_start, rank);
```

**Design Decisions**:
- Materialized view for performance (no real-time aggregation)
- Score formula weights engagement types differently
- Weekly snapshots enable "top movers" and historical trends
- `REFRESH CONCURRENTLY` allows reads during refresh

---

## Phase 2: Ranking Service

### File: `apps/api/src/services/ranking.service.ts`

```typescript
import type { FastifyInstance } from 'fastify';

interface UserRank {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rank: number;
  score: number;
  totalVibes: number;
  sparklesReceived: number;
  followerCount: number;
  currentStreak: number;
}

interface UserStats {
  rank: number;
  score: number;
  totalVibes: number;
  sparklesReceived: number;
  followerCount: number;
  currentStreak: number;
  longestStreak: number;
  percentile: number;
}

type LeaderboardType = 'score' | 'sparkles' | 'followers' | 'streak';

export class RankingService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get user's rank and stats
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    // Get user's score data
    const userResult = await this.fastify.db.query(
      `SELECT * FROM user_scores WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Calculate rank (position among all users by score)
    const rankResult = await this.fastify.db.query(
      `SELECT COUNT(*) + 1 as rank
       FROM user_scores
       WHERE score > $1`,
      [user.score]
    );

    // Calculate percentile
    const totalResult = await this.fastify.db.query(
      `SELECT COUNT(*) as total FROM user_scores WHERE score > 0`
    );

    const rank = parseInt(rankResult.rows[0].rank as string, 10);
    const total = parseInt(totalResult.rows[0].total as string, 10);
    const percentile = total > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

    return {
      rank,
      score: parseInt(user.score as string, 10),
      totalVibes: parseInt(user.total_vibes as string, 10),
      sparklesReceived: parseInt(user.sparkles_received as string, 10),
      followerCount: parseInt(user.follower_count as string, 10),
      currentStreak: parseInt(user.current_streak as string, 10),
      longestStreak: parseInt(user.longest_streak as string, 10),
      percentile
    };
  }

  /**
   * Get leaderboard by type
   */
  async getLeaderboard(
    type: LeaderboardType = 'score',
    limit: number = 20,
    offset: number = 0
  ): Promise<{ users: UserRank[]; total: number }> {
    const orderColumn = this.getOrderColumn(type);

    const result = await this.fastify.db.query(
      `SELECT
        user_id,
        username,
        display_name,
        avatar_url,
        score,
        total_vibes,
        sparkles_received,
        follower_count,
        current_streak,
        ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC, user_id) as rank
       FROM user_scores
       WHERE score > 0
       ORDER BY ${orderColumn} DESC, user_id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalResult = await this.fastify.db.query(
      `SELECT COUNT(*) as total FROM user_scores WHERE score > 0`
    );

    return {
      users: result.rows.map(row => this.mapRankRow(row)),
      total: parseInt(totalResult.rows[0].total as string, 10)
    };
  }

  /**
   * Get users around a specific user (context leaderboard)
   * Shows N users above and below the target user
   */
  async getLeaderboardAroundUser(
    userId: string,
    context: number = 5
  ): Promise<{ users: UserRank[]; userRank: number }> {
    // First get user's rank
    const stats = await this.getUserStats(userId);
    if (!stats) {
      return { users: [], userRank: 0 };
    }

    const userRank = stats.rank;
    const startRank = Math.max(1, userRank - context);
    const endRank = userRank + context;

    const result = await this.fastify.db.query(
      `WITH ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (ORDER BY score DESC, user_id) as rank
        FROM user_scores
        WHERE score > 0
      )
      SELECT * FROM ranked
      WHERE rank >= $1 AND rank <= $2
      ORDER BY rank`,
      [startRank, endRank]
    );

    return {
      users: result.rows.map(row => this.mapRankRow(row)),
      userRank
    };
  }

  /**
   * Refresh the materialized view (call periodically)
   */
  async refreshScores(): Promise<void> {
    await this.fastify.db.query('SELECT refresh_user_scores()');
  }

  /**
   * Get top movers (biggest rank improvements this week)
   */
  async getTopMovers(limit: number = 10): Promise<Array<UserRank & { rankChange: number }>> {
    const result = await this.fastify.db.query(
      `WITH current_ranks AS (
        SELECT
          user_id,
          ROW_NUMBER() OVER (ORDER BY score DESC) as current_rank
        FROM user_scores
        WHERE score > 0
      ),
      last_week AS (
        SELECT user_id, rank as last_rank
        FROM weekly_rankings
        WHERE week_start = (
          SELECT MAX(week_start) FROM weekly_rankings
          WHERE week_start < date_trunc('week', NOW())
        )
      )
      SELECT
        us.*,
        cr.current_rank as rank,
        COALESCE(lw.last_rank, 9999) - cr.current_rank as rank_change
      FROM user_scores us
      JOIN current_ranks cr ON cr.user_id = us.user_id
      LEFT JOIN last_week lw ON lw.user_id = us.user_id
      WHERE COALESCE(lw.last_rank, 9999) - cr.current_rank > 0
      ORDER BY rank_change DESC
      LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      ...this.mapRankRow(row),
      rankChange: parseInt(row.rank_change as string, 10)
    }));
  }

  private getOrderColumn(type: LeaderboardType): string {
    switch (type) {
      case 'sparkles': return 'sparkles_received';
      case 'followers': return 'follower_count';
      case 'streak': return 'current_streak';
      default: return 'score';
    }
  }

  private mapRankRow(row: Record<string, unknown>): UserRank {
    return {
      userId: row.user_id as string,
      username: row.username as string,
      displayName: row.display_name as string | null,
      avatarUrl: row.avatar_url as string | null,
      rank: parseInt(row.rank as string, 10),
      score: parseInt(row.score as string, 10),
      totalVibes: parseInt(row.total_vibes as string, 10),
      sparklesReceived: parseInt(row.sparkles_received as string, 10),
      followerCount: parseInt(row.follower_count as string, 10),
      currentStreak: parseInt(row.current_streak as string, 10)
    };
  }
}
```

---

## Phase 3: Expose Existing Streak Leaderboard

### Modify: `apps/api/src/routes/streaks/index.ts`

Add endpoint for streak leaderboard (service method already exists):

```typescript
// GET /streaks/leaderboard
fastify.get('/leaderboard', {
  preHandler: [fastify.optionalAuth],
}, async (request) => {
  const { limit = 10 } = request.query as { limit?: number };

  const leaderboard = await streakService.getLeaderboard(
    Math.min(limit, 50)
  );

  return { leaderboard };
});
```

---

## Phase 4: API Routes for Rankings

### File: `apps/api/src/routes/rankings/index.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { RankingService } from '../../services/ranking.service.js';

interface LeaderboardQuery {
  type?: 'score' | 'sparkles' | 'followers' | 'streak';
  limit?: number;
  offset?: number;
}

interface UserRankParams {
  userId: string;
}

export const rankingRoutes: FastifyPluginAsync = async (fastify) => {
  const rankingService = new RankingService(fastify);

  // GET /rankings/leaderboard - Global leaderboard
  fastify.get<{ Querystring: LeaderboardQuery }>('/leaderboard', async (request) => {
    const { type = 'score', limit = 20, offset = 0 } = request.query;

    const result = await rankingService.getLeaderboard(
      type,
      Math.min(limit, 100),
      offset
    );

    return result;
  });

  // GET /rankings/me - Current user's rank and stats
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.user;

    const stats = await rankingService.getUserStats(userId);

    if (!stats) {
      return reply.status(404).send({ error: 'Stats not found' });
    }

    return stats;
  });

  // GET /rankings/user/:userId - Specific user's stats
  fastify.get<{ Params: UserRankParams }>('/user/:userId', async (request, reply) => {
    const { userId } = request.params;

    const stats = await rankingService.getUserStats(userId);

    if (!stats) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return stats;
  });

  // GET /rankings/around-me - Leaderboard context around current user
  fastify.get('/around-me', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { userId } = request.user;
    const { context = 5 } = request.query as { context?: number };

    return rankingService.getLeaderboardAroundUser(
      userId,
      Math.min(context, 10)
    );
  });

  // GET /rankings/movers - Top rank movers this week
  fastify.get('/movers', async (request) => {
    const { limit = 10 } = request.query as { limit?: number };

    const movers = await rankingService.getTopMovers(Math.min(limit, 20));

    return { movers };
  });

  // POST /rankings/refresh - Admin: refresh scores (protect in production)
  fastify.post('/refresh', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    // In production, add admin check here
    await rankingService.refreshScores();
    return { success: true };
  });
};
```

### Register in `apps/api/src/app.ts`:

```typescript
import { rankingRoutes } from './routes/rankings/index.js';

// In route registration section:
fastify.register(rankingRoutes, { prefix: '/rankings' });
```

---

## Phase 5: Scheduled Score Refresh

### Option A: Database cron (pg_cron)

```sql
-- Run every 15 minutes
SELECT cron.schedule('refresh-user-scores', '*/15 * * * *', 'SELECT refresh_user_scores()');

-- Weekly ranking snapshot (every Monday at midnight)
SELECT cron.schedule('weekly-ranking-snapshot', '0 0 * * 1', $$
  INSERT INTO weekly_rankings (user_id, week_start, rank, score, sparkles_received, vibes_posted)
  SELECT
    user_id,
    date_trunc('week', NOW()),
    ROW_NUMBER() OVER (ORDER BY score DESC),
    score,
    sparkles_received,
    total_vibes
  FROM user_scores
  WHERE score > 0
$$);
```

### Option B: Application-level (Node.js)

Create `apps/api/src/jobs/refresh-rankings.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { RankingService } from '../services/ranking.service.js';

export function setupRankingRefreshJob(fastify: FastifyInstance) {
  const rankingService = new RankingService(fastify);

  // Refresh every 15 minutes
  setInterval(async () => {
    try {
      await rankingService.refreshScores();
      fastify.log.info('User scores refreshed');
    } catch (err) {
      fastify.log.error({ err }, 'Failed to refresh user scores');
    }
  }, 15 * 60 * 1000);

  // Initial refresh on startup
  rankingService.refreshScores().catch(err => {
    fastify.log.error({ err }, 'Initial score refresh failed');
  });
}
```

---

## Phase 6: Frontend API Client

### Modify: `apps/web/src/lib/api.ts`

```typescript
// Types
export interface UserStats {
  rank: number;
  score: number;
  totalVibes: number;
  sparklesReceived: number;
  followerCount: number;
  currentStreak: number;
  longestStreak: number;
  percentile: number;
}

export interface UserRank {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rank: number;
  score: number;
  totalVibes: number;
  sparklesReceived: number;
  followerCount: number;
  currentStreak: number;
}

export interface LeaderboardResponse {
  users: UserRank[];
  total: number;
}

export interface AroundMeResponse {
  users: UserRank[];
  userRank: number;
}

// API methods
async getMyStats() {
  return this.fetch<UserStats>('/rankings/me');
}

async getUserStats(userId: string) {
  return this.fetch<UserStats>(`/rankings/user/${userId}`);
}

async getLeaderboard(
  type: 'score' | 'sparkles' | 'followers' | 'streak' = 'score',
  limit: number = 20,
  offset: number = 0
) {
  return this.fetch<LeaderboardResponse>(
    `/rankings/leaderboard?type=${type}&limit=${limit}&offset=${offset}`
  );
}

async getLeaderboardAroundMe(context: number = 5) {
  return this.fetch<AroundMeResponse>(
    `/rankings/around-me?context=${context}`
  );
}

async getTopMovers(limit: number = 10) {
  return this.fetch<{ movers: Array<UserRank & { rankChange: number }> }>(
    `/rankings/movers?limit=${limit}`
  );
}

async getStreakLeaderboard(limit: number = 10) {
  return this.fetch<{ leaderboard: UserRank[] }>(
    `/streaks/leaderboard?limit=${limit}`
  );
}
```

---

## Phase 7: Frontend Hooks

### File: `apps/web/src/hooks/useRankings.ts`

```typescript
'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api, UserStats, UserRank, LeaderboardResponse } from '@/lib/api';

// Hook for current user's stats
export function useMyStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-stats'],
    queryFn: async () => {
      const { data, error } = await api.getMyStats();
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    stats: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

// Hook for any user's stats
export function useUserStats(userId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await api.getUserStats(userId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    stats: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

// Hook for leaderboard with pagination
export function useLeaderboard(
  type: 'score' | 'sparkles' | 'followers' | 'streak' = 'score'
) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ['leaderboard', type],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await api.getLeaderboard(type, 20, pageParam);
      if (error) throw new Error(error.message);
      return { ...data, offset: pageParam };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const nextOffset = lastPage.offset + 20;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const users = data?.pages.flatMap(page => page?.users || []) || [];
  const total = data?.pages[0]?.total || 0;

  return {
    users,
    total,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
    loadMore: fetchNextPage,
    error: error instanceof Error ? error.message : null,
  };
}

// Hook for leaderboard around current user
export function useLeaderboardAroundMe() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard-around-me'],
    queryFn: async () => {
      const { data, error } = await api.getLeaderboardAroundMe(5);
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    users: data?.users || [],
    myRank: data?.userRank || 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

// Hook for top movers
export function useTopMovers() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['top-movers'],
    queryFn: async () => {
      const { data, error } = await api.getTopMovers(10);
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    movers: data?.movers || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
```

---

## Phase 8: Stats Panel Component

### File: `apps/web/src/components/dashboard/StatsPanel.tsx`

```typescript
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useMyStats } from '@/hooks/useRankings';

const streakMilestones: Record<number, string> = {
  7: '🔥',
  14: '💪',
  30: '⭐',
  50: '🌟',
  100: '💯',
  365: '👑',
};

function getStreakEmoji(streak: number): string {
  const milestones = Object.keys(streakMilestones)
    .map(Number)
    .sort((a, b) => b - a);

  for (const milestone of milestones) {
    if (streak >= milestone) {
      return streakMilestones[milestone];
    }
  }
  return '';
}

export function StatsPanel() {
  const { user } = useAuth();
  const { stats, isLoading, error } = useMyStats();

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-error/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-warning/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-success/60" />
          </div>
          <span className="font-mono text-xs text-terminal-text-secondary">
            @{user.username} ~ stats
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="py-4 text-center">
            <span className="font-mono text-xs text-terminal-text-dim">
              loading stats...
            </span>
          </div>
        ) : error ? (
          <div className="py-4 text-center">
            <span className="font-mono text-xs text-terminal-error">
              error loading stats
            </span>
          </div>
        ) : stats ? (
          <>
            <StatRow
              label="streak"
              value={`${stats.currentStreak} days`}
              accent
              suffix={getStreakEmoji(stats.currentStreak)}
            />
            <StatRow label="posts" value={stats.totalVibes.toString()} />
            <StatRow label="sparkles" value={stats.sparklesReceived.toString()} />
            <StatRow
              label="rank"
              value={`#${stats.rank}`}
              link="/leaderboard"
            />
          </>
        ) : (
          <div className="py-4 text-center">
            <span className="font-mono text-xs text-terminal-text-dim">
              post your first vibe!
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  accent?: boolean;
  suffix?: string;
  link?: string;
}

function StatRow({ label, value, accent, suffix, link }: StatRowProps) {
  const content = (
    <div className="flex items-center justify-between py-1">
      <span className="font-mono text-sm text-terminal-text-secondary">
        {label}:
      </span>
      <span className={`font-mono text-sm ${accent ? 'text-terminal-accent' : 'text-terminal-text'}`}>
        {value} {suffix}
      </span>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block hover:bg-terminal-bg-hover rounded px-1 -mx-1 transition-colors">
        {content}
      </Link>
    );
  }

  return content;
}
```

---

## Phase 9: Leaderboard Page

### File: `apps/web/src/app/leaderboard/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useLeaderboard, useLeaderboardAroundMe } from '@/hooks/useRankings';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type LeaderboardType = 'score' | 'sparkles' | 'followers' | 'streak';

const tabs: { type: LeaderboardType; label: string }[] = [
  { type: 'score', label: 'top' },
  { type: 'sparkles', label: 'sparkles' },
  { type: 'followers', label: 'followers' },
  { type: 'streak', label: 'streaks' },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('score');
  const { user } = useAuth();
  const { users, isLoading, hasMore, loadMore, isLoadingMore } = useLeaderboard(activeTab);
  const { users: nearbyUsers, myRank } = useLeaderboardAroundMe();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-mono text-xl text-terminal-text">
          <span className="text-terminal-accent">$</span> leaderboard
        </h1>
        {user && myRank > 0 && (
          <p className="font-mono text-sm text-terminal-text-secondary mt-1">
            your rank: <span className="text-terminal-accent">#{myRank}</span>
          </p>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-terminal-bg-elevated p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={cn(
              'flex-1 font-mono text-sm py-2 px-3 rounded transition-colors',
              activeTab === tab.type
                ? 'bg-terminal-accent text-terminal-bg'
                : 'text-terminal-text-secondary hover:text-terminal-text'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden">
        <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-error/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-warning/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-success/60" />
            </div>
            <span className="font-mono text-xs text-terminal-text-secondary">
              rankings ~ ./{activeTab}
            </span>
          </div>
        </div>

        <div className="divide-y divide-terminal-border">
          {isLoading ? (
            <div className="py-8 text-center">
              <span className="font-mono text-sm text-terminal-text-dim">
                loading...
              </span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center">
              <span className="font-mono text-sm text-terminal-text-dim">
                no rankings yet
              </span>
            </div>
          ) : (
            users.map((rankedUser) => (
              <LeaderboardRow
                key={rankedUser.userId}
                user={rankedUser}
                type={activeTab}
                isCurrentUser={user?.id === rankedUser.userId}
              />
            ))
          )}
        </div>

        {hasMore && (
          <div className="p-4 border-t border-terminal-border">
            <button
              onClick={() => loadMore()}
              disabled={isLoadingMore}
              className="w-full font-mono text-sm text-terminal-accent hover:underline disabled:opacity-50"
            >
              {isLoadingMore ? 'loading...' : 'load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface LeaderboardRowProps {
  user: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    rank: number;
    score: number;
    sparklesReceived: number;
    followerCount: number;
    currentStreak: number;
  };
  type: LeaderboardType;
  isCurrentUser: boolean;
}

function LeaderboardRow({ user, type, isCurrentUser }: LeaderboardRowProps) {
  const getValue = () => {
    switch (type) {
      case 'sparkles': return user.sparklesReceived;
      case 'followers': return user.followerCount;
      case 'streak': return `${user.currentStreak}d`;
      default: return user.score;
    }
  };

  return (
    <Link
      href={`/profile/${user.username}`}
      className={cn(
        'flex items-center gap-4 px-4 py-3 hover:bg-terminal-bg-hover transition-colors',
        isCurrentUser && 'bg-terminal-accent/10'
      )}
    >
      {/* Rank */}
      <span className={cn(
        'font-mono text-lg w-8',
        user.rank <= 3 ? 'text-terminal-accent font-bold' : 'text-terminal-text-dim'
      )}>
        {user.rank}
      </span>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-terminal-bg-elevated">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.username}
            width={40}
            height={40}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-terminal-text-dim">
            {user.username[0]}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm text-terminal-text truncate">
          @{user.username}
        </div>
        {user.displayName && (
          <div className="font-mono text-xs text-terminal-text-dim truncate">
            {user.displayName}
          </div>
        )}
      </div>

      {/* Value */}
      <span className="font-mono text-sm text-terminal-accent">
        {getValue()}
      </span>
    </Link>
  );
}
```

---

## Phase 10: Activity Panel Component

### File: `apps/web/src/components/dashboard/ActivityPanel.tsx`

```typescript
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications'; // Requires notifications system

// This component requires a notifications system to be fully functional
// For now, showing static structure

interface Activity {
  id: string;
  type: 'sparkle' | 'follow' | 'comment' | 'vibe';
  username: string;
  message: string;
  createdAt: Date;
}

interface ActivityPanelProps {
  activities?: Activity[];
}

export function ActivityPanel({ activities = [] }: ActivityPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-error/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-warning/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-success/60" />
          </div>
          <span className="font-mono text-xs text-terminal-text-secondary">
            activity ~ ./recent
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1">
        {activities.length === 0 ? (
          <div className="py-4 text-center">
            <span className="font-mono text-xs text-terminal-text-dim">
              no recent activity
            </span>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </motion.div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const icon = getActivityIcon(activity.type);

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md">
      <span className="text-terminal-text-dim">{icon}</span>
      <span className="flex-1 font-mono text-sm text-terminal-text truncate">
        <Link
          href={`/profile/${activity.username}`}
          className="text-terminal-accent hover:underline"
        >
          @{activity.username}
        </Link>
        {' '}{activity.message}
      </span>
      <span className="font-mono text-xs text-terminal-text-dim whitespace-nowrap">
        {formatRelativeTime(activity.createdAt)}
      </span>
    </div>
  );
}

function getActivityIcon(type: Activity['type']): string {
  switch (type) {
    case 'sparkle': return '✨';
    case 'follow': return '→';
    case 'comment': return '💬';
    case 'vibe': return '→';
    default: return '•';
  }
}
```

**Note**: The Activity Panel requires a notifications system which is a separate feature. The component structure is provided but won't be functional without implementing notifications.

---

## Implementation Checklist

### Database
- [ ] Create migration `008_user_rankings.sql`
- [ ] Run migration
- [ ] Set up periodic refresh (cron or app-level)

### Backend
- [ ] Create `ranking.service.ts`
- [ ] Create `routes/rankings/index.ts`
- [ ] Register ranking routes in `app.ts`
- [ ] Add streak leaderboard endpoint to existing streak routes
- [ ] Set up score refresh job (if using app-level)

### Frontend
- [ ] Add ranking types to API client
- [ ] Add ranking API methods to client
- [ ] Create `useRankings.ts` hooks
- [ ] Create `StatsPanel.tsx` component
- [ ] Create `/leaderboard` page
- [ ] Create `ActivityPanel.tsx` component (placeholder until notifications)
- [ ] Integrate StatsPanel into dashboard/profile

### Testing
- [ ] Test score calculation accuracy
- [ ] Test leaderboard pagination
- [ ] Verify rank calculation is correct
- [ ] Test materialized view refresh
- [ ] Performance test with large user base

---

## Score Formula

Current formula (adjustable):
```
score = (sparkles_received × 1) + (comments_received × 3) + (followers × 5) + (current_streak × 2) + (total_vibes × 0.5)
```

**Rationale**:
- Followers weighted highest (social proof, retention indicator)
- Comments weighted high (engagement quality)
- Streak encourages daily usage
- Sparkles baseline engagement
- Vibes count contributes but doesn't dominate

---

## Notes

- Materialized view avoids expensive real-time calculations
- Refresh frequency is configurable (default: 15 min)
- Weekly snapshots enable "top movers" and historical analysis
- Activity panel is a placeholder requiring notifications system
- Score formula can be tuned based on desired behavior
- Consider adding decay factor for older content in future iterations

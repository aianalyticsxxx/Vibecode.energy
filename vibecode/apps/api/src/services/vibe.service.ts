import type { FastifyInstance } from 'fastify';
import { VibecheckService } from './vibecheck.service.js';
import { StreakService } from './streak.service.js';

interface CreateVibeData {
  userId: string;
  imageUrl: string;
  imageKey: string;
  caption?: string;
}

interface FeedOptions {
  cursor?: string;
  limit: number;
  currentUserId?: string;
}

interface DiscoveryFeedOptions extends FeedOptions {
  sort?: 'recent' | 'popular';
}

interface Vibe {
  id: string;
  imageUrl: string;
  caption?: string;
  vibeDate: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  sparkleCount: number;
  hasSparkled: boolean;
  isLate: boolean;
  lateByMinutes: number;
}

interface FeedResult {
  vibes: Vibe[];
  nextCursor?: string;
  hasMore: boolean;
}

export class VibeService {
  private vibecheckService: VibecheckService;
  private streakService: StreakService;

  constructor(private fastify: FastifyInstance) {
    this.vibecheckService = new VibecheckService(fastify);
    this.streakService = new StreakService(fastify);
  }

  /**
   * Get chronological feed with cursor pagination
   */
  async getFeed(options: FeedOptions): Promise<FeedResult> {
    const { cursor, limit, currentUserId } = options;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `WHERE v.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    const limitParam = paramIndex;
    params.push(limit + 1);
    paramIndex++;

    let hasReactedClause = 'false as has_reacted';
    if (currentUserId) {
      hasReactedClause = `EXISTS(SELECT 1 FROM reactions WHERE vibe_id = v.id AND user_id = $${paramIndex}) as has_reacted`;
      params.push(currentUserId);
    }

    const query = `
      SELECT
        v.id,
        v.image_url,
        v.caption,
        v.vibe_date,
        v.created_at,
        v.is_late,
        v.late_by_minutes,
        u.id as author_id,
        u.username,
        u.display_name,
        u.avatar_url,
        COUNT(r.id) as reaction_count,
        ${hasReactedClause}
      FROM vibes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN reactions r ON r.vibe_id = v.id
      ${cursorCondition}
      GROUP BY v.id, u.id
      ORDER BY v.created_at DESC
      LIMIT $${limitParam}
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const vibes = result.rows.slice(0, limit).map(this.mapVibeRow.bind(this));
    const lastVibe = vibes[vibes.length - 1];
    const nextCursor = hasMore && lastVibe
      ? lastVibe.createdAt.toISOString()
      : undefined;

    return {
      vibes,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get today's vibe for a user
   */
  async getTodayVibe(userId: string): Promise<Vibe | null> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.fastify.db.query(
      `SELECT
        v.id,
        v.image_url,
        v.caption,
        v.vibe_date,
        v.created_at,
        v.is_late,
        v.late_by_minutes,
        u.id as author_id,
        u.username,
        u.display_name,
        u.avatar_url,
        COUNT(r.id) as reaction_count,
        false as has_reacted
      FROM vibes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN reactions r ON r.vibe_id = v.id
      WHERE v.user_id = $1 AND v.vibe_date = $2
      GROUP BY v.id, u.id
      LIMIT 1`,
      [userId, today]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapVibeRow(result.rows[0]);
  }

  /**
   * Get a single vibe by ID
   */
  async getById(vibeId: string, currentUserId?: string): Promise<Vibe | null> {
    const hasReactedClause = currentUserId
      ? 'EXISTS(SELECT 1 FROM reactions WHERE vibe_id = v.id AND user_id = $2) as has_reacted'
      : 'false as has_reacted';

    const result = await this.fastify.db.query(
      `SELECT
        v.id,
        v.image_url,
        v.caption,
        v.vibe_date,
        v.created_at,
        v.is_late,
        v.late_by_minutes,
        u.id as author_id,
        u.username,
        u.display_name,
        u.avatar_url,
        COUNT(r.id) as reaction_count,
        ${hasReactedClause}
      FROM vibes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN reactions r ON r.vibe_id = v.id
      WHERE v.id = $1
      GROUP BY v.id, u.id`,
      currentUserId ? [vibeId, currentUserId] : [vibeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapVibeRow(result.rows[0]);
  }

  /**
   * Create or replace today's vibe (one per day limit)
   */
  async createOrReplaceTodayVibe(data: CreateVibeData): Promise<Vibe> {
    const { userId, imageUrl, imageKey, caption } = data;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get today's vibecheck to calculate late status
    const vibecheck = await this.vibecheckService.getTodaysVibecheck();
    let isLate = false;
    let lateByMinutes = 0;
    let vibecheckId: string | null = null;

    if (vibecheck) {
      vibecheckId = vibecheck.id;
      const lateStatus = this.vibecheckService.calculateLateStatus(vibecheck.triggerTime, now);
      isLate = lateStatus.isLate;
      lateByMinutes = lateStatus.lateByMinutes;
    }

    // Use UPSERT (ON CONFLICT) for atomic create/replace
    const result = await this.fastify.db.query(
      `INSERT INTO vibes (user_id, image_url, image_key, caption, vibe_date, vibecheck_id, is_late, late_by_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, vibe_date)
       DO UPDATE SET
         image_url = EXCLUDED.image_url,
         image_key = EXCLUDED.image_key,
         caption = EXCLUDED.caption,
         vibecheck_id = EXCLUDED.vibecheck_id,
         is_late = EXCLUDED.is_late,
         late_by_minutes = EXCLUDED.late_by_minutes,
         created_at = NOW()
       RETURNING id`,
      [userId, imageUrl, imageKey, caption, today, vibecheckId, isLate, lateByMinutes]
    );

    const vibeId = result.rows[0].id;

    // Update user's streak
    await this.streakService.updateStreakOnPost(userId, now);

    // Fetch the complete vibe with author info
    const vibe = await this.getById(vibeId, userId);
    if (!vibe) {
      throw new Error('Failed to fetch created vibe');
    }

    return vibe;
  }

  /**
   * Get discovery feed (all vibes from all users)
   */
  async getDiscoveryFeed(options: DiscoveryFeedOptions): Promise<FeedResult> {
    const { cursor, limit, currentUserId, sort = 'recent' } = options;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    let cursorCondition = '';
    if (cursor) {
      if (sort === 'recent') {
        cursorCondition = `WHERE v.created_at < $${paramIndex}`;
      } else {
        cursorCondition = `WHERE (COUNT(r.id), v.created_at) < ($${paramIndex}::int, $${paramIndex + 1}::timestamptz)`;
        paramIndex++;
      }
      params.push(cursor);
      paramIndex++;
    }

    const limitParam = paramIndex;
    params.push(limit + 1);
    paramIndex++;

    let hasReactedClause = 'false as has_reacted';
    if (currentUserId) {
      hasReactedClause = `EXISTS(SELECT 1 FROM reactions WHERE vibe_id = v.id AND user_id = $${paramIndex}) as has_reacted`;
      params.push(currentUserId);
    }

    const orderBy = sort === 'popular'
      ? 'COUNT(r.id) DESC, v.created_at DESC'
      : 'v.created_at DESC';

    const query = `
      SELECT
        v.id,
        v.image_url,
        v.caption,
        v.vibe_date,
        v.created_at,
        v.is_late,
        v.late_by_minutes,
        u.id as author_id,
        u.username,
        u.display_name,
        u.avatar_url,
        COUNT(r.id) as reaction_count,
        ${hasReactedClause}
      FROM vibes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN reactions r ON r.vibe_id = v.id
      ${cursor && sort === 'recent' ? cursorCondition : ''}
      GROUP BY v.id, u.id
      ORDER BY ${orderBy}
      LIMIT $${limitParam}
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const vibes = result.rows.slice(0, limit).map(this.mapVibeRow.bind(this));
    const lastVibe = vibes[vibes.length - 1];
    const nextCursor = hasMore && lastVibe
      ? lastVibe.createdAt.toISOString()
      : undefined;

    return {
      vibes,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Delete a vibe (only by owner)
   */
  async delete(vibeId: string, userId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `DELETE FROM vibes WHERE id = $1 AND user_id = $2 RETURNING id`,
      [vibeId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Map database row to Vibe object
   */
  private mapVibeRow(row: Record<string, unknown>): Vibe {
    return {
      id: row.id as string,
      imageUrl: row.image_url as string,
      caption: row.caption as string | undefined,
      vibeDate: row.vibe_date as string,
      createdAt: new Date(row.created_at as string),
      // Use 'user' to match frontend expectations
      user: {
        id: row.author_id as string,
        username: row.username as string,
        displayName: row.display_name as string,
        avatarUrl: row.avatar_url as string | undefined,
      },
      // Use sparkleCount/hasSparkled to match frontend
      sparkleCount: parseInt(row.reaction_count as string, 10) || 0,
      hasSparkled: row.has_reacted as boolean,
      isLate: row.is_late as boolean || false,
      lateByMinutes: (row.late_by_minutes as number) || 0,
    };
  }
}

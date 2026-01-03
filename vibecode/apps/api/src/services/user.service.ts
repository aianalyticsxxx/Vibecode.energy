import type { FastifyInstance } from 'fastify';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  vibeCount: number;
  streakCount: number;
}

interface UserVibesOptions {
  userId: string;
  cursor?: string;
  limit: number;
  currentUserId?: string;
}

interface Vibe {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: Date;
  updatedAt: Date;
  reactionCount: number;
  hasReacted: boolean;
}

interface UserVibesResult {
  vibes: Vibe[];
  nextCursor?: string;
  hasMore: boolean;
}

interface UpdateProfileData {
  displayName?: string;
  bio?: string;
}

export class UserService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get user by username
   */
  async getByUsername(username: string, _currentUserId?: string): Promise<User | null> {
    const result = await this.fastify.db.query(
      `SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.bio,
        u.created_at,
        COUNT(DISTINCT v.id) as vibe_count,
        COALESCE(s.streak_count, 0) as streak_count
      FROM users u
      LEFT JOIN vibes v ON v.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as streak_count
        FROM (
          SELECT DISTINCT DATE(created_at) as vibe_date
          FROM vibes
          WHERE user_id = u.id
          ORDER BY vibe_date DESC
        ) dates
        WHERE vibe_date >= CURRENT_DATE - (
          SELECT COUNT(*) - 1
          FROM (
            SELECT DISTINCT DATE(created_at) as d
            FROM vibes
            WHERE user_id = u.id
              AND created_at >= CURRENT_DATE - INTERVAL '365 days'
            ORDER BY d DESC
          ) consecutive
          WHERE d >= CURRENT_DATE - INTERVAL '365 days'
        )
      ) s ON true
      WHERE u.username = $1
      GROUP BY u.id, s.streak_count`,
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      createdAt: new Date(row.created_at),
      vibeCount: parseInt(row.vibe_count, 10) || 0,
      streakCount: parseInt(row.streak_count, 10) || 0,
    };
  }

  /**
   * Get user's vibes with pagination
   */
  async getUserVibes(options: UserVibesOptions): Promise<UserVibesResult> {
    const { userId, cursor, limit, currentUserId } = options;

    let query = `
      SELECT
        v.id,
        v.content,
        v.media_url,
        v.media_type,
        v.created_at,
        v.updated_at,
        COUNT(r.id) as reaction_count
        ${currentUserId ? ', EXISTS(SELECT 1 FROM reactions WHERE vibe_id = v.id AND user_id = $3) as has_reacted' : ', false as has_reacted'}
      FROM vibes v
      LEFT JOIN reactions r ON r.vibe_id = v.id
      WHERE v.user_id = $1
    `;

    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (cursor) {
      query += ` AND v.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    if (currentUserId) {
      params.push(currentUserId);
    }

    query += `
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex}
    `;
    params.splice(currentUserId ? 2 : paramIndex - 1, 0, limit + 1);

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const vibes = result.rows.slice(0, limit).map((row): Vibe => ({
      id: row.id,
      content: row.content,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      reactionCount: parseInt(row.reaction_count, 10) || 0,
      hasReacted: row.has_reacted,
    }));

    const nextCursor = hasMore && vibes.length > 0
      ? vibes[vibes.length - 1].createdAt.toISOString()
      : undefined;

    return {
      vibes,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<User | null> {
    const updates: string[] = [];
    const params: (string | undefined)[] = [];
    let paramIndex = 1;

    if (data.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex}`);
      params.push(data.displayName);
      paramIndex++;
    }

    if (data.bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      params.push(data.bio);
      paramIndex++;
    }

    if (updates.length === 0) {
      // No updates, just fetch and return current user
      const result = await this.fastify.db.query(
        `SELECT id, username, display_name, avatar_url, bio, created_at
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        createdAt: new Date(row.created_at),
        vibeCount: 0,
        streakCount: 0,
      };
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    const result = await this.fastify.db.query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, username, display_name, avatar_url, bio, created_at`,
      params
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      createdAt: new Date(row.created_at),
      vibeCount: 0,
      streakCount: 0,
    };
  }

  /**
   * Calculate consecutive day streak for a user
   */
  async calculateStreak(userId: string): Promise<number> {
    const result = await this.fastify.db.query(
      `WITH daily_vibes AS (
        SELECT DISTINCT DATE(created_at) as vibe_date
        FROM vibes
        WHERE user_id = $1
        ORDER BY vibe_date DESC
      ),
      numbered AS (
        SELECT
          vibe_date,
          vibe_date - (ROW_NUMBER() OVER (ORDER BY vibe_date DESC))::int as grp
        FROM daily_vibes
      )
      SELECT COUNT(*) as streak
      FROM numbered
      WHERE grp = (SELECT grp FROM numbered WHERE vibe_date = CURRENT_DATE)
         OR (grp = (SELECT grp FROM numbered WHERE vibe_date = CURRENT_DATE - 1) AND NOT EXISTS (SELECT 1 FROM daily_vibes WHERE vibe_date = CURRENT_DATE))`,
      [userId]
    );

    return parseInt(result.rows[0]?.streak, 10) || 0;
  }
}

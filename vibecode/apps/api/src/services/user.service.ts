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
  imageUrl: string;
  caption: string | null;
  vibeDate: string;
  createdAt: Date;
  sparkleCount: number;
  hasSparkled: boolean;
  isLate: boolean;
  lateByMinutes: number;
}

interface UserVibesResult {
  items: Vibe[];
  nextCursor: string | null;
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
        COALESCE(us.current_streak, 0) as streak_count
      FROM users u
      LEFT JOIN vibes v ON v.user_id = u.id
      LEFT JOIN user_streaks us ON us.user_id = u.id
      WHERE u.username = $1
      GROUP BY u.id, us.current_streak`,
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

    const params: (string | number)[] = [userId, limit + 1];
    let paramIndex = 3;

    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `AND v.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    let hasSparkledSelect = 'false as has_sparkled';
    if (currentUserId) {
      hasSparkledSelect = `EXISTS(SELECT 1 FROM reactions WHERE vibe_id = v.id AND user_id = $${paramIndex}) as has_sparkled`;
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
        COUNT(r.id) as sparkle_count,
        ${hasSparkledSelect}
      FROM vibes v
      LEFT JOIN reactions r ON r.vibe_id = v.id
      WHERE v.user_id = $1
      ${cursorCondition}
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT $2
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const items = result.rows.slice(0, limit).map((row): Vibe => ({
      id: row.id,
      imageUrl: row.image_url,
      caption: row.caption,
      vibeDate: row.vibe_date,
      createdAt: new Date(row.created_at),
      sparkleCount: parseInt(row.sparkle_count, 10) || 0,
      hasSparkled: row.has_sparkled || false,
      isLate: row.is_late || false,
      lateByMinutes: row.late_by_minutes || 0,
    }));

    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? lastItem.createdAt.toISOString()
      : null;

    return {
      items,
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

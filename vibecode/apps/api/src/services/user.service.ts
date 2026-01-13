import type { FastifyInstance } from 'fastify';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  shotCount: number;
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
        COUNT(DISTINCT s.id) as shot_count
      FROM users u
      LEFT JOIN shots s ON s.user_id = u.id
      WHERE u.username = $1
      GROUP BY u.id`,
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
      shotCount: parseInt(row.shot_count, 10) || 0,
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
        shotCount: 0,
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
      shotCount: 0,
    };
  }
}

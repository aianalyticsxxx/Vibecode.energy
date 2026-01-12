import type { FastifyInstance } from 'fastify';

interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  lastActiveAt: Date;
}

// Consider users online if active in last 5 minutes
const ONLINE_THRESHOLD_MINUTES = 5;

export class PresenceService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Update user's last active timestamp
   */
  async updatePresence(userId: string): Promise<void> {
    await this.fastify.db.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [userId]
    );
  }

  /**
   * Get online users from the current user's following list
   */
  async getOnlineFollowing(userId: string): Promise<OnlineUser[]> {
    const result = await this.fastify.db.query(
      `SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.last_active_at
      FROM users u
      JOIN follows f ON f.following_id = u.id
      WHERE f.follower_id = $1
        AND u.last_active_at > NOW() - INTERVAL '${ONLINE_THRESHOLD_MINUTES} minutes'
      ORDER BY u.last_active_at DESC
      LIMIT 20`,
      [userId]
    );

    return result.rows.map(this.mapUserRow);
  }

  /**
   * Check if a specific user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `SELECT 1 FROM users
       WHERE id = $1
       AND last_active_at > NOW() - INTERVAL '${ONLINE_THRESHOLD_MINUTES} minutes'`,
      [userId]
    );
    return result.rows.length > 0;
  }

  private mapUserRow(row: Record<string, unknown>): OnlineUser {
    return {
      id: row.id as string,
      username: row.username as string,
      displayName: row.display_name as string,
      avatarUrl: row.avatar_url as string | undefined,
      lastActiveAt: new Date(row.last_active_at as string),
    };
  }
}

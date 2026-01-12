import type { FastifyInstance } from 'fastify';

interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface FollowListResult {
  users: FollowUser[];
  nextCursor?: string;
  hasMore: boolean;
}

export class FollowService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Follow a user
   */
  async follow(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) {
      return false;
    }

    try {
      await this.fastify.db.query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [followerId, followingId]
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `DELETE FROM follows
       WHERE follower_id = $1 AND following_id = $2
       RETURNING follower_id`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if user A follows user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `SELECT 1 FROM follows
       WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get follower count for a user
   */
  async getFollowerCount(userId: string): Promise<number> {
    const result = await this.fastify.db.query(
      `SELECT COUNT(*) as count FROM follows WHERE following_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10) || 0;
  }

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    const result = await this.fastify.db.query(
      `SELECT COUNT(*) as count FROM follows WHERE follower_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10) || 0;
  }

  /**
   * Get followers of a user with pagination
   */
  async getFollowers(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<FollowListResult> {
    const params: (string | number)[] = [userId, limit + 1];
    let cursorCondition = '';

    if (cursor) {
      cursorCondition = 'AND f.created_at < $3';
      params.push(cursor);
    }

    const result = await this.fastify.db.query(
      `SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        f.created_at
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1 ${cursorCondition}
      ORDER BY f.created_at DESC
      LIMIT $2`,
      params
    );

    const hasMore = result.rows.length > limit;
    const users = result.rows.slice(0, limit).map(this.mapUserRow);
    const lastUser = result.rows[result.rows.length - 1];
    const nextCursor = hasMore && lastUser
      ? lastUser.created_at.toISOString()
      : undefined;

    return { users, nextCursor, hasMore };
  }

  /**
   * Get users that a user is following with pagination
   */
  async getFollowing(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<FollowListResult> {
    const params: (string | number)[] = [userId, limit + 1];
    let cursorCondition = '';

    if (cursor) {
      cursorCondition = 'AND f.created_at < $3';
      params.push(cursor);
    }

    const result = await this.fastify.db.query(
      `SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        f.created_at
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1 ${cursorCondition}
      ORDER BY f.created_at DESC
      LIMIT $2`,
      params
    );

    const hasMore = result.rows.length > limit;
    const users = result.rows.slice(0, limit).map(this.mapUserRow);
    const lastUser = result.rows[result.rows.length - 1];
    const nextCursor = hasMore && lastUser
      ? lastUser.created_at.toISOString()
      : undefined;

    return { users, nextCursor, hasMore };
  }

  /**
   * Get IDs of users that a user is following
   */
  async getFollowingIds(userId: string): Promise<string[]> {
    const result = await this.fastify.db.query(
      `SELECT following_id FROM follows WHERE follower_id = $1`,
      [userId]
    );
    return result.rows.map(row => row.following_id);
  }

  private mapUserRow(row: Record<string, unknown>): FollowUser {
    return {
      id: row.id as string,
      username: row.username as string,
      displayName: row.display_name as string,
      avatarUrl: row.avatar_url as string | undefined,
    };
  }
}

import type { FastifyInstance } from 'fastify';

export interface AdminUserListItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  lastActiveAt: Date | null;
  shotCount: number;
  followerCount: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  bio: string | null;
  followingCount: number;
  totalSparkles: number;
  reportsAgainst: number;
}

export interface AdminShot {
  id: string;
  prompt: string;
  imageUrl: string;
  caption: string | null;
  resultType: string;
  createdAt: Date;
  sparkleCount: number;
  commentCount: number;
  userId: string;
  username: string;
  displayName: string;
  challengeId: string | null;
}

export interface AdminComment {
  id: string;
  shotId: string;
  content: string;
  createdAt: Date;
  userId: string;
  username: string;
  displayName: string;
}

export interface AdminTag {
  id: string;
  name: string;
  shotCount: number;
  createdAt: Date;
}

export interface AdminAuditLogEntry {
  id: string;
  adminUserId: string;
  adminUsername: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface DashboardStats {
  totalUsers: number;
  activeToday: number;
  totalShots: number;
  pendingReports: number;
  newUsersToday: number;
  shotsToday: number;
}

export interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  contentStats: { date: string; shots: number; comments: number; sparkles: number }[];
  engagement: { dau: number; wau: number; mau: number };
  topCreators: { userId: string; username: string; shotCount: number; sparkleCount: number }[];
}

export class AdminService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      'SELECT is_admin FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    return result.rows.length > 0 && result.rows[0].is_admin === true;
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const result = await this.fastify.db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL)::int as total_users,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND last_active_at > $1)::int as active_today,
        (SELECT COUNT(*) FROM shots)::int as total_shots,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending')::int as pending_reports,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at > $1)::int as new_users_today,
        (SELECT COUNT(*) FROM shots WHERE created_at > $1)::int as shots_today
    `, [startOfDay.toISOString()]);

    const row = result.rows[0];
    return {
      totalUsers: row.total_users,
      activeToday: row.active_today,
      totalShots: row.total_shots,
      pendingReports: row.pending_reports,
      newUsersToday: row.new_users_today,
      shotsToday: row.shots_today,
    };
  }

  /**
   * Get users list
   */
  async getUsers(params: {
    search?: string;
    status?: string;
    isAdmin?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<{ users: AdminUserListItem[]; nextCursor: string | null; hasMore: boolean }> {
    const { search, status, isAdmin, cursor, limit = 20 } = params;
    const queryParams: (string | number | boolean)[] = [limit + 1];
    const conditions: string[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      conditions.push(`(u.username ILIKE $${queryParams.length} OR u.display_name ILIKE $${queryParams.length})`);
    }

    if (status === 'active') {
      conditions.push('u.deleted_at IS NULL');
    } else if (status === 'banned') {
      conditions.push('u.deleted_at IS NOT NULL');
    }

    if (isAdmin !== undefined) {
      queryParams.push(isAdmin);
      conditions.push(`u.is_admin = $${queryParams.length}`);
    }

    if (cursor) {
      queryParams.push(cursor);
      conditions.push(`u.created_at < $${queryParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.fastify.db.query(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.is_admin,
        u.created_at,
        u.deleted_at,
        u.last_active_at,
        (SELECT COUNT(*) FROM shots s WHERE s.user_id = u.id)::int as shot_count,
        (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id)::int as follower_count
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $1
    `, queryParams);

    const hasMore = result.rows.length > limit;
    const users = result.rows.slice(0, limit).map(this.mapUserListItem);
    const lastUser = users[users.length - 1];

    return {
      users,
      nextCursor: hasMore && lastUser ? lastUser.createdAt.toISOString() : null,
      hasMore,
    };
  }

  /**
   * Get user detail
   */
  async getUserById(userId: string): Promise<AdminUserDetail | null> {
    const result = await this.fastify.db.query(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.bio,
        u.is_admin,
        u.created_at,
        u.deleted_at,
        u.last_active_at,
        (SELECT COUNT(*) FROM shots s WHERE s.user_id = u.id)::int as shot_count,
        (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id)::int as follower_count,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id)::int as following_count,
        (SELECT COALESCE(SUM((SELECT COUNT(*) FROM reactions r WHERE r.shot_id = s.id)), 0) FROM shots s WHERE s.user_id = u.id)::int as total_sparkles,
        (SELECT COUNT(*) FROM reports r WHERE r.reported_user_id = u.id)::int as reports_against
      FROM users u
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) return null;
    return this.mapUserDetail(result.rows[0]);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: { isAdmin?: boolean }): Promise<AdminUserDetail | null> {
    const updates: string[] = [];
    const values: (boolean | string)[] = [];

    if (data.isAdmin !== undefined) {
      values.push(data.isAdmin);
      updates.push(`is_admin = $${values.length}`);
    }

    if (updates.length === 0) return this.getUserById(userId);

    values.push(userId);
    await this.fastify.db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`,
      values
    );

    return this.getUserById(userId);
  }

  /**
   * Ban user (soft delete)
   */
  async banUser(userId: string, reason: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Delete user (hard delete)
   */
  async deleteUser(userId: string): Promise<boolean> {
    // First delete related data
    await this.fastify.db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await this.fastify.db.query('DELETE FROM reactions WHERE user_id = $1', [userId]);
    await this.fastify.db.query('DELETE FROM comments WHERE user_id = $1', [userId]);
    await this.fastify.db.query('DELETE FROM follows WHERE follower_id = $1 OR following_id = $1', [userId]);
    await this.fastify.db.query('DELETE FROM shots WHERE user_id = $1', [userId]);

    const result = await this.fastify.db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeUserSessions(userId: string): Promise<boolean> {
    await this.fastify.db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    return true;
  }

  /**
   * Get shots list
   */
  async getShots(params: {
    userId?: string;
    challengeId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ shots: AdminShot[]; nextCursor: string | null; hasMore: boolean }> {
    const { userId, challengeId, cursor, limit = 20 } = params;
    const queryParams: (string | number)[] = [limit + 1];
    const conditions: string[] = [];

    if (userId) {
      queryParams.push(userId);
      conditions.push(`s.user_id = $${queryParams.length}`);
    }

    if (challengeId) {
      queryParams.push(challengeId);
      conditions.push(`s.challenge_id = $${queryParams.length}`);
    }

    if (cursor) {
      queryParams.push(cursor);
      conditions.push(`s.created_at < $${queryParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.fastify.db.query(`
      SELECT
        s.id,
        s.prompt,
        s.image_url,
        s.caption,
        s.result_type,
        s.created_at,
        s.user_id,
        s.challenge_id,
        u.username,
        u.display_name,
        (SELECT COUNT(*) FROM reactions r WHERE r.shot_id = s.id)::int as sparkle_count,
        (SELECT COUNT(*) FROM comments c WHERE c.shot_id = s.id)::int as comment_count
      FROM shots s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $1
    `, queryParams);

    const hasMore = result.rows.length > limit;
    const shots = result.rows.slice(0, limit).map(this.mapShot);
    const lastShot = shots[shots.length - 1];

    return {
      shots,
      nextCursor: hasMore && lastShot ? lastShot.createdAt.toISOString() : null,
      hasMore,
    };
  }

  /**
   * Delete shot
   */
  async deleteShot(shotId: string): Promise<boolean> {
    // Delete related data first
    await this.fastify.db.query('DELETE FROM reactions WHERE shot_id = $1', [shotId]);
    await this.fastify.db.query('DELETE FROM comments WHERE shot_id = $1', [shotId]);
    await this.fastify.db.query('DELETE FROM challenge_votes WHERE shot_id = $1', [shotId]);
    await this.fastify.db.query('DELETE FROM shot_tags WHERE shot_id = $1', [shotId]);

    const result = await this.fastify.db.query(
      'DELETE FROM shots WHERE id = $1 RETURNING id',
      [shotId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get comments list
   */
  async getComments(params: {
    shotId?: string;
    userId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ comments: AdminComment[]; nextCursor: string | null; hasMore: boolean }> {
    const { shotId, userId, cursor, limit = 20 } = params;
    const queryParams: (string | number)[] = [limit + 1];
    const conditions: string[] = [];

    if (shotId) {
      queryParams.push(shotId);
      conditions.push(`c.shot_id = $${queryParams.length}`);
    }

    if (userId) {
      queryParams.push(userId);
      conditions.push(`c.user_id = $${queryParams.length}`);
    }

    if (cursor) {
      queryParams.push(cursor);
      conditions.push(`c.created_at < $${queryParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.fastify.db.query(`
      SELECT
        c.id,
        c.shot_id,
        c.content,
        c.created_at,
        c.user_id,
        u.username,
        u.display_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $1
    `, queryParams);

    const hasMore = result.rows.length > limit;
    const comments = result.rows.slice(0, limit).map(this.mapComment);
    const lastComment = comments[comments.length - 1];

    return {
      comments,
      nextCursor: hasMore && lastComment ? lastComment.createdAt.toISOString() : null,
      hasMore,
    };
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      'DELETE FROM comments WHERE id = $1 RETURNING id',
      [commentId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get tags list
   */
  async getTags(params: {
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ tags: AdminTag[]; nextCursor: string | null; hasMore: boolean }> {
    const { search, cursor, limit = 20 } = params;
    const queryParams: (string | number)[] = [limit + 1];
    const conditions: string[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      conditions.push(`t.name ILIKE $${queryParams.length}`);
    }

    if (cursor) {
      queryParams.push(cursor);
      conditions.push(`t.created_at < $${queryParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.fastify.db.query(`
      SELECT
        t.id,
        t.name,
        t.created_at,
        (SELECT COUNT(*) FROM shot_tags st WHERE st.tag_id = t.id)::int as shot_count
      FROM tags t
      ${whereClause}
      ORDER BY shot_count DESC, t.created_at DESC
      LIMIT $1
    `, queryParams);

    const hasMore = result.rows.length > limit;
    const tags = result.rows.slice(0, limit).map(this.mapTag);
    const lastTag = tags[tags.length - 1];

    return {
      tags,
      nextCursor: hasMore && lastTag ? lastTag.createdAt.toISOString() : null,
      hasMore,
    };
  }

  /**
   * Delete tag
   */
  async deleteTag(tagId: string): Promise<boolean> {
    await this.fastify.db.query('DELETE FROM shot_tags WHERE tag_id = $1', [tagId]);
    const result = await this.fastify.db.query(
      'DELETE FROM tags WHERE id = $1 RETURNING id',
      [tagId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get analytics data
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<AnalyticsData> {
    // User growth
    const userGrowthResult = await this.fastify.db.query(`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at BETWEEN $1 AND $2 AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate, endDate]);

    // Content stats
    const contentResult = await this.fastify.db.query(`
      SELECT
        DATE(s.created_at) as date,
        COUNT(DISTINCT s.id)::int as shots,
        (SELECT COUNT(*) FROM comments c WHERE DATE(c.created_at) = DATE(s.created_at))::int as comments,
        (SELECT COUNT(*) FROM reactions r WHERE DATE(r.created_at) = DATE(s.created_at))::int as sparkles
      FROM shots s
      WHERE s.created_at BETWEEN $1 AND $2
      GROUP BY DATE(s.created_at)
      ORDER BY date
    `, [startDate, endDate]);

    // Engagement (DAU/WAU/MAU)
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const engagementResult = await this.fastify.db.query(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM shots WHERE created_at > $1)::int +
        (SELECT COUNT(DISTINCT user_id) FROM reactions WHERE created_at > $1)::int as dau,
        (SELECT COUNT(DISTINCT user_id) FROM shots WHERE created_at > $2)::int +
        (SELECT COUNT(DISTINCT user_id) FROM reactions WHERE created_at > $2)::int as wau,
        (SELECT COUNT(DISTINCT user_id) FROM shots WHERE created_at > $3)::int +
        (SELECT COUNT(DISTINCT user_id) FROM reactions WHERE created_at > $3)::int as mau
    `, [dayAgo, weekAgo, monthAgo]);

    // Top creators
    const topCreatorsResult = await this.fastify.db.query(`
      SELECT
        u.id as user_id,
        u.username,
        COUNT(DISTINCT s.id)::int as shot_count,
        COALESCE(SUM((SELECT COUNT(*) FROM reactions r WHERE r.shot_id = s.id)), 0)::int as sparkle_count
      FROM users u
      JOIN shots s ON s.user_id = u.id
      WHERE u.deleted_at IS NULL
      GROUP BY u.id, u.username
      ORDER BY sparkle_count DESC
      LIMIT 10
    `);

    return {
      userGrowth: userGrowthResult.rows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        count: r.count,
      })),
      contentStats: contentResult.rows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        shots: r.shots,
        comments: r.comments,
        sparkles: r.sparkles,
      })),
      engagement: {
        dau: engagementResult.rows[0]?.dau || 0,
        wau: engagementResult.rows[0]?.wau || 0,
        mau: engagementResult.rows[0]?.mau || 0,
      },
      topCreators: topCreatorsResult.rows.map(r => ({
        userId: r.user_id,
        username: r.username,
        shotCount: r.shot_count,
        sparkleCount: r.sparkle_count,
      })),
    };
  }

  /**
   * Log admin action
   */
  async logAction(
    adminUserId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.fastify.db.query(`
      INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
      VALUES ($1, $2, $3, $4, $5)
    `, [adminUserId, action, targetType || null, targetId || null, details ? JSON.stringify(details) : null]);
  }

  /**
   * Get audit log
   */
  async getAuditLog(params: {
    adminId?: string;
    action?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ entries: AdminAuditLogEntry[]; nextCursor: string | null; hasMore: boolean }> {
    const { adminId, action, cursor, limit = 20 } = params;
    const queryParams: (string | number)[] = [limit + 1];
    const conditions: string[] = [];

    if (adminId) {
      queryParams.push(adminId);
      conditions.push(`a.admin_user_id = $${queryParams.length}`);
    }

    if (action) {
      queryParams.push(action);
      conditions.push(`a.action = $${queryParams.length}`);
    }

    if (cursor) {
      queryParams.push(cursor);
      conditions.push(`a.created_at < $${queryParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.fastify.db.query(`
      SELECT
        a.id,
        a.admin_user_id,
        a.action,
        a.target_type,
        a.target_id,
        a.details,
        a.created_at,
        u.username as admin_username
      FROM admin_audit_log a
      JOIN users u ON a.admin_user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $1
    `, queryParams);

    const hasMore = result.rows.length > limit;
    const entries = result.rows.slice(0, limit).map(this.mapAuditLogEntry);
    const lastEntry = entries[entries.length - 1];

    return {
      entries,
      nextCursor: hasMore && lastEntry ? lastEntry.createdAt.toISOString() : null,
      hasMore,
    };
  }

  // Mapping functions
  private mapUserListItem(row: Record<string, unknown>): AdminUserListItem {
    return {
      id: row.id as string,
      username: row.username as string,
      displayName: row.display_name as string,
      avatarUrl: row.avatar_url as string | null,
      isAdmin: row.is_admin as boolean,
      createdAt: new Date(row.created_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      lastActiveAt: row.last_active_at ? new Date(row.last_active_at as string) : null,
      shotCount: row.shot_count as number,
      followerCount: row.follower_count as number,
    };
  }

  private mapUserDetail(row: Record<string, unknown>): AdminUserDetail {
    return {
      ...this.mapUserListItem(row),
      bio: row.bio as string | null,
      followingCount: row.following_count as number,
      totalSparkles: row.total_sparkles as number,
      reportsAgainst: row.reports_against as number,
    };
  }

  private mapShot(row: Record<string, unknown>): AdminShot {
    return {
      id: row.id as string,
      prompt: row.prompt as string,
      imageUrl: row.image_url as string,
      caption: row.caption as string | null,
      resultType: row.result_type as string,
      createdAt: new Date(row.created_at as string),
      sparkleCount: row.sparkle_count as number,
      commentCount: row.comment_count as number,
      userId: row.user_id as string,
      username: row.username as string,
      displayName: row.display_name as string,
      challengeId: row.challenge_id as string | null,
    };
  }

  private mapComment(row: Record<string, unknown>): AdminComment {
    return {
      id: row.id as string,
      shotId: row.shot_id as string,
      content: row.content as string,
      createdAt: new Date(row.created_at as string),
      userId: row.user_id as string,
      username: row.username as string,
      displayName: row.display_name as string,
    };
  }

  private mapTag(row: Record<string, unknown>): AdminTag {
    return {
      id: row.id as string,
      name: row.name as string,
      shotCount: row.shot_count as number,
      createdAt: new Date(row.created_at as string),
    };
  }

  private mapAuditLogEntry(row: Record<string, unknown>): AdminAuditLogEntry {
    return {
      id: row.id as string,
      adminUserId: row.admin_user_id as string,
      adminUsername: row.admin_username as string,
      action: row.action as string,
      targetType: row.target_type as string | null,
      targetId: row.target_id as string | null,
      details: row.details as Record<string, unknown> | null,
      createdAt: new Date(row.created_at as string),
    };
  }
}

import type { FastifyPluginAsync } from 'fastify';
import { AdminService } from '../../services/admin.service.js';

interface AdminAuthPreHandler {
  preHandler: [(request: { user: { userId: string } }, reply: unknown) => Promise<void>];
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const adminService = new AdminService(fastify);

  // Middleware to check admin status
  const requireAdmin = async (request: { user: { userId: string } }, reply: { status: (code: number) => { send: (data: { error: string }) => void } }) => {
    const isAdmin = await adminService.isAdmin(request.user.userId);
    if (!isAdmin) {
      reply.status(403).send({ error: 'Admin access required' });
    }
  };

  // GET /admin/stats - Dashboard stats
  fastify.get('/stats', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async () => {
    return adminService.getDashboardStats();
  });

  // ============ USERS ============

  // GET /admin/users - List users
  fastify.get<{
    Querystring: {
      search?: string;
      status?: string;
      isAdmin?: string;
      cursor?: string;
      limit?: string;
    };
  }>('/users', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    const { search, status, isAdmin, cursor, limit } = request.query;
    return adminService.getUsers({
      search,
      status,
      isAdmin: isAdmin !== undefined ? isAdmin === 'true' : undefined,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  });

  // GET /admin/users/:id - Get user detail
  fastify.get<{ Params: { id: string } }>('/users/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const user = await adminService.getUserById(request.params.id);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return user;
  });

  // PATCH /admin/users/:id - Update user
  fastify.patch<{
    Params: { id: string };
    Body: { isAdmin?: boolean };
  }>('/users/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const user = await adminService.updateUser(request.params.id, request.body);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    await adminService.logAction(
      request.user.userId,
      'user_updated',
      'user',
      request.params.id,
      request.body
    );
    return { user };
  });

  // POST /admin/users/:id/ban - Ban user
  fastify.post<{
    Params: { id: string };
    Body: { reason: string };
  }>('/users/:id/ban', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const success = await adminService.banUser(request.params.id, request.body.reason);
    if (!success) {
      return reply.status(404).send({ error: 'User not found or already banned' });
    }
    await adminService.logAction(
      request.user.userId,
      'user_banned',
      'user',
      request.params.id,
      { reason: request.body.reason }
    );
    return { success: true };
  });

  // DELETE /admin/users/:id - Delete user
  fastify.delete<{ Params: { id: string } }>('/users/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const success = await adminService.deleteUser(request.params.id);
    if (!success) {
      return reply.status(404).send({ error: 'User not found' });
    }
    await adminService.logAction(
      request.user.userId,
      'user_deleted',
      'user',
      request.params.id
    );
    return { success: true };
  });

  // POST /admin/users/:id/revoke - Revoke sessions
  fastify.post<{ Params: { id: string } }>('/users/:id/revoke', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    await adminService.revokeUserSessions(request.params.id);
    await adminService.logAction(
      request.user.userId,
      'sessions_revoked',
      'user',
      request.params.id
    );
    return { success: true };
  });

  // ============ SHOTS ============

  // GET /admin/shots - List shots
  fastify.get<{
    Querystring: {
      userId?: string;
      challengeId?: string;
      cursor?: string;
      limit?: string;
    };
  }>('/shots', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    const { userId, challengeId, cursor, limit } = request.query;
    return adminService.getShots({
      userId,
      challengeId,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  });

  // DELETE /admin/shots/:id - Delete shot
  fastify.delete<{ Params: { id: string } }>('/shots/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const success = await adminService.deleteShot(request.params.id);
    if (!success) {
      return reply.status(404).send({ error: 'Shot not found' });
    }
    await adminService.logAction(
      request.user.userId,
      'shot_deleted',
      'shot',
      request.params.id
    );
    return { success: true };
  });

  // ============ COMMENTS ============

  // GET /admin/comments - List comments
  fastify.get<{
    Querystring: {
      shotId?: string;
      userId?: string;
      cursor?: string;
      limit?: string;
    };
  }>('/comments', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    const { shotId, userId, cursor, limit } = request.query;
    return adminService.getComments({
      shotId,
      userId,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  });

  // DELETE /admin/comments/:id - Delete comment
  fastify.delete<{ Params: { id: string } }>('/comments/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const success = await adminService.deleteComment(request.params.id);
    if (!success) {
      return reply.status(404).send({ error: 'Comment not found' });
    }
    await adminService.logAction(
      request.user.userId,
      'comment_deleted',
      'comment',
      request.params.id
    );
    return { success: true };
  });

  // ============ TAGS ============

  // GET /admin/tags - List tags
  fastify.get<{
    Querystring: {
      search?: string;
      cursor?: string;
      limit?: string;
    };
  }>('/tags', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    const { search, cursor, limit } = request.query;
    return adminService.getTags({
      search,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  });

  // DELETE /admin/tags/:id - Delete tag
  fastify.delete<{ Params: { id: string } }>('/tags/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const success = await adminService.deleteTag(request.params.id);
    if (!success) {
      return reply.status(404).send({ error: 'Tag not found' });
    }
    await adminService.logAction(
      request.user.userId,
      'tag_deleted',
      'tag',
      request.params.id
    );
    return { success: true };
  });

  // POST /admin/tags/:id/ban - Ban tag
  fastify.post<{
    Params: { id: string };
    Body: { reason: string };
  }>('/tags/:id/ban', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    // Delete the tag and add to banned list
    await adminService.deleteTag(request.params.id);
    await adminService.logAction(
      request.user.userId,
      'tag_banned',
      'tag',
      request.params.id,
      { reason: request.body.reason }
    );
    return { success: true };
  });

  // ============ CHALLENGES ============

  // GET /admin/challenges - List challenges
  fastify.get<{
    Querystring: {
      status?: string;
      cursor?: string;
      limit?: string;
    };
  }>('/challenges', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    // Use existing challenge service
    const { status, cursor, limit } = request.query;
    const result = await fastify.db.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM shots s WHERE s.challenge_id = c.id)::int as submission_count,
        CASE
          WHEN NOW() < c.starts_at THEN 'upcoming'
          WHEN NOW() BETWEEN c.starts_at AND c.ends_at THEN 'active'
          WHEN c.voting_ends_at IS NOT NULL AND NOW() BETWEEN c.ends_at AND c.voting_ends_at THEN 'voting'
          ELSE 'completed'
        END as status
      FROM challenges c
      ${status && status !== 'all' ? 'WHERE CASE WHEN NOW() < c.starts_at THEN \'upcoming\' WHEN NOW() BETWEEN c.starts_at AND c.ends_at THEN \'active\' WHEN c.voting_ends_at IS NOT NULL AND NOW() BETWEEN c.ends_at AND c.voting_ends_at THEN \'voting\' ELSE \'completed\' END = $2' : ''}
      ORDER BY c.created_at DESC
      LIMIT $1
    `, status && status !== 'all' ? [parseInt(limit || '20', 10) + 1, status] : [parseInt(limit || '20', 10) + 1]);

    const limitNum = parseInt(limit || '20', 10);
    const hasMore = result.rows.length > limitNum;
    const challenges = result.rows.slice(0, limitNum).map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      createdBy: row.created_by,
      isOfficial: row.is_official,
      isSponsored: row.is_sponsored,
      sponsorName: row.sponsor_name,
      prizeDescription: row.prize_description,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      votingEndsAt: row.voting_ends_at,
      createdAt: row.created_at,
      status: row.status,
      submissionCount: row.submission_count,
    }));

    return { challenges, nextCursor: null, hasMore };
  });

  // POST /admin/challenges - Create challenge
  fastify.post<{
    Body: {
      title: string;
      description?: string;
      startsAt: string;
      endsAt: string;
      votingEndsAt?: string;
      isOfficial?: boolean;
      isSponsored?: boolean;
      sponsorName?: string;
      prizeDescription?: string;
    };
  }>('/challenges', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    const { title, description, startsAt, endsAt, votingEndsAt, isOfficial, isSponsored, sponsorName, prizeDescription } = request.body;

    const result = await fastify.db.query(`
      INSERT INTO challenges (title, description, created_by, starts_at, ends_at, voting_ends_at, is_official, is_sponsored, sponsor_name, prize_description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title,
      description || null,
      request.user.userId,
      startsAt,
      endsAt,
      votingEndsAt || null,
      isOfficial || false,
      isSponsored || false,
      sponsorName || null,
      prizeDescription || null,
    ]);

    await adminService.logAction(
      request.user.userId,
      'challenge_created',
      'challenge',
      result.rows[0].id
    );

    return { challenge: result.rows[0] };
  });

  // PATCH /admin/challenges/:id - Update challenge
  fastify.patch<{
    Params: { id: string };
    Body: Partial<{
      title: string;
      description: string;
      startsAt: string;
      endsAt: string;
      votingEndsAt: string;
      isOfficial: boolean;
      isSponsored: boolean;
      sponsorName: string;
      prizeDescription: string;
    }>;
  }>('/challenges/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    const updates: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      startsAt: 'starts_at',
      endsAt: 'ends_at',
      votingEndsAt: 'voting_ends_at',
      isOfficial: 'is_official',
      isSponsored: 'is_sponsored',
      sponsorName: 'sponsor_name',
      prizeDescription: 'prize_description',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if ((request.body as Record<string, unknown>)[key] !== undefined) {
        values.push((request.body as Record<string, unknown>)[key]);
        updates.push(`${dbField} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    values.push(request.params.id);
    const result = await fastify.db.query(
      `UPDATE challenges SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Challenge not found' });
    }

    await adminService.logAction(
      request.user.userId,
      'challenge_updated',
      'challenge',
      request.params.id,
      request.body
    );

    return { challenge: result.rows[0] };
  });

  // DELETE /admin/challenges/:id - Delete challenge
  fastify.delete<{ Params: { id: string } }>('/challenges/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    // Delete related data first
    await fastify.db.query('UPDATE shots SET challenge_id = NULL WHERE challenge_id = $1', [request.params.id]);
    await fastify.db.query('DELETE FROM challenge_votes WHERE shot_id IN (SELECT id FROM shots WHERE challenge_id = $1)', [request.params.id]);

    const result = await fastify.db.query(
      'DELETE FROM challenges WHERE id = $1 RETURNING id',
      [request.params.id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Challenge not found' });
    }

    await adminService.logAction(
      request.user.userId,
      'challenge_deleted',
      'challenge',
      request.params.id
    );

    return { success: true };
  });

  // ============ ANALYTICS ============

  // GET /admin/analytics - Get analytics data
  fastify.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>('/analytics', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();
    const startDate = request.query.startDate
      ? new Date(request.query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    return adminService.getAnalytics(startDate, endDate);
  });

  // ============ AUDIT LOG ============

  // GET /admin/audit-log - Get audit log
  fastify.get<{
    Querystring: {
      adminId?: string;
      action?: string;
      cursor?: string;
      limit?: string;
    };
  }>('/audit-log', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request) => {
    const { adminId, action, cursor, limit } = request.query;
    return adminService.getAuditLog({
      adminId,
      action,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  });
};

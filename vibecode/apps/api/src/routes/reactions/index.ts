import type { FastifyPluginAsync } from 'fastify';
import { reactionSchemas } from '../../schemas/reaction.schemas.js';

interface ShotParams {
  id: string;
}

interface Reaction {
  id: string;
  shotId: string;
  userId: string;
  reactionType: 'sparkle';
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export const reactionRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /shots/:id/sparkle - Add sparkle reaction
  fastify.post<{ Params: ShotParams }>('/:id/sparkle', {
    preHandler: [fastify.authenticate],
    schema: reactionSchemas.addReaction,
  }, async (request, reply) => {
    const { id: shotId } = request.params;
    const { userId } = request.user;

    // Check if shot exists
    const shotCheck = await fastify.db.query(
      'SELECT id FROM shots WHERE id = $1',
      [shotId]
    );

    if (shotCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Shot not found' });
    }

    // Check if already reacted with sparkle
    const existingReaction = await fastify.db.query(
      `SELECT id FROM reactions WHERE shot_id = $1 AND user_id = $2 AND reaction_type = 'sparkle'`,
      [shotId, userId]
    );

    if (existingReaction.rows.length > 0) {
      return reply.status(409).send({ error: 'Already sparkled this shot' });
    }

    // Add sparkle reaction
    await fastify.db.query(
      `INSERT INTO reactions (shot_id, user_id, reaction_type)
       VALUES ($1, $2, 'sparkle')`,
      [shotId, userId]
    );

    // Get updated reaction count
    const countResult = await fastify.db.query(
      'SELECT COUNT(*) as count FROM reactions WHERE shot_id = $1',
      [shotId]
    );

    return {
      success: true,
      sparkleCount: parseInt(countResult.rows[0].count, 10),
    };
  });

  // DELETE /shots/:id/sparkle - Remove sparkle reaction
  fastify.delete<{ Params: ShotParams }>('/:id/sparkle', {
    preHandler: [fastify.authenticate],
    schema: reactionSchemas.removeReaction,
  }, async (request, reply) => {
    const { id: shotId } = request.params;
    const { userId } = request.user;

    // Remove sparkle reaction
    const result = await fastify.db.query(
      `DELETE FROM reactions WHERE shot_id = $1 AND user_id = $2 AND reaction_type = 'sparkle' RETURNING id`,
      [shotId, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Sparkle not found' });
    }

    // Get updated reaction count
    const countResult = await fastify.db.query(
      'SELECT COUNT(*) as count FROM reactions WHERE shot_id = $1',
      [shotId]
    );

    return {
      success: true,
      sparkleCount: parseInt(countResult.rows[0].count, 10),
    };
  });

  // GET /shots/:id/reactions - Get all reactions for a shot
  fastify.get<{ Params: ShotParams }>('/:id/reactions', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id: shotId } = request.params;

    // Check if shot exists
    const shotCheck = await fastify.db.query(
      'SELECT id FROM shots WHERE id = $1',
      [shotId]
    );

    if (shotCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Shot not found' });
    }

    const result = await fastify.db.query(
      `SELECT
        r.id,
        r.shot_id,
        r.user_id,
        r.reaction_type,
        r.created_at,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.shot_id = $1 AND r.reaction_type = 'sparkle'
       ORDER BY r.created_at DESC`,
      [shotId]
    );

    const reactions: Reaction[] = result.rows.map((row) => ({
      id: row.id,
      shotId: row.shot_id,
      userId: row.user_id,
      reactionType: 'sparkle' as const,
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
    }));

    return {
      reactions,
      total: reactions.length,
      sparkleCount: reactions.length,
    };
  });
};

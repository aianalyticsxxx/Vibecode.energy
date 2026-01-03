import type { FastifyPluginAsync } from 'fastify';
import { reactionSchemas } from '../../schemas/reaction.schemas.js';

interface VibeParams {
  id: string;
}

export const reactionRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /vibes/:id/vibe - Add sparkle reaction
  fastify.post<{ Params: VibeParams }>('/:id/vibe', {
    preHandler: [fastify.authenticate],
    schema: reactionSchemas.addReaction,
  }, async (request, reply) => {
    const { id: vibeId } = request.params;
    const { userId } = request.user;

    // Check if vibe exists
    const vibeCheck = await fastify.db.query(
      'SELECT id FROM vibes WHERE id = $1',
      [vibeId]
    );

    if (vibeCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Vibe not found' });
    }

    // Check if already reacted
    const existingReaction = await fastify.db.query(
      'SELECT id FROM reactions WHERE vibe_id = $1 AND user_id = $2',
      [vibeId, userId]
    );

    if (existingReaction.rows.length > 0) {
      return reply.status(409).send({ error: 'Already reacted to this vibe' });
    }

    // Add reaction
    await fastify.db.query(
      `INSERT INTO reactions (vibe_id, user_id, emoji)
       VALUES ($1, $2, $3)`,
      [vibeId, userId, 'sparkle']
    );

    // Get updated reaction count
    const countResult = await fastify.db.query(
      'SELECT COUNT(*) as count FROM reactions WHERE vibe_id = $1',
      [vibeId]
    );

    return {
      success: true,
      reactionCount: parseInt(countResult.rows[0].count, 10),
    };
  });

  // DELETE /vibes/:id/vibe - Remove sparkle reaction
  fastify.delete<{ Params: VibeParams }>('/:id/vibe', {
    preHandler: [fastify.authenticate],
    schema: reactionSchemas.removeReaction,
  }, async (request, reply) => {
    const { id: vibeId } = request.params;
    const { userId } = request.user;

    // Remove reaction
    const result = await fastify.db.query(
      `DELETE FROM reactions WHERE vibe_id = $1 AND user_id = $2 RETURNING id`,
      [vibeId, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Reaction not found' });
    }

    // Get updated reaction count
    const countResult = await fastify.db.query(
      'SELECT COUNT(*) as count FROM reactions WHERE vibe_id = $1',
      [vibeId]
    );

    return {
      success: true,
      reactionCount: parseInt(countResult.rows[0].count, 10),
    };
  });
};

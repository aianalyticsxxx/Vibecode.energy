import type { FastifyPluginAsync } from 'fastify';
import { reactionSchemas } from '../../schemas/reaction.schemas.js';

interface VibeParams {
  id: string;
}

interface PhotoReactionBody {
  imageUrl: string;
  imageKey: string;
}

interface Reaction {
  id: string;
  vibeId: string;
  userId: string;
  reactionType: 'sparkle' | 'photo';
  imageUrl: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
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

    // Check if already reacted with sparkle
    const existingReaction = await fastify.db.query(
      `SELECT id FROM reactions WHERE vibe_id = $1 AND user_id = $2 AND reaction_type = 'sparkle'`,
      [vibeId, userId]
    );

    if (existingReaction.rows.length > 0) {
      return reply.status(409).send({ error: 'Already reacted to this vibe' });
    }

    // Add sparkle reaction
    await fastify.db.query(
      `INSERT INTO reactions (vibe_id, user_id, reaction_type)
       VALUES ($1, $2, 'sparkle')`,
      [vibeId, userId]
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

    // Remove sparkle reaction
    const result = await fastify.db.query(
      `DELETE FROM reactions WHERE vibe_id = $1 AND user_id = $2 AND reaction_type = 'sparkle' RETURNING id`,
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

  // POST /vibes/:id/reactions/photo - Add photo reaction (RealMoji style)
  fastify.post<{ Params: VibeParams; Body: PhotoReactionBody }>('/:id/reactions/photo', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id: vibeId } = request.params;
    const { userId } = request.user;
    const { imageUrl, imageKey } = request.body;

    if (!imageUrl || !imageKey) {
      return reply.status(400).send({ error: 'Image URL and key are required' });
    }

    // Check if vibe exists
    const vibeCheck = await fastify.db.query(
      'SELECT id FROM vibes WHERE id = $1',
      [vibeId]
    );

    if (vibeCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Vibe not found' });
    }

    // Check if already has photo reaction
    const existingReaction = await fastify.db.query(
      `SELECT id FROM reactions WHERE vibe_id = $1 AND user_id = $2 AND reaction_type = 'photo'`,
      [vibeId, userId]
    );

    if (existingReaction.rows.length > 0) {
      // Update existing photo reaction
      await fastify.db.query(
        `UPDATE reactions SET image_url = $1, image_key = $2, created_at = NOW()
         WHERE vibe_id = $3 AND user_id = $4 AND reaction_type = 'photo'`,
        [imageUrl, imageKey, vibeId, userId]
      );
    } else {
      // Add new photo reaction
      await fastify.db.query(
        `INSERT INTO reactions (vibe_id, user_id, reaction_type, image_url, image_key)
         VALUES ($1, $2, 'photo', $3, $4)`,
        [vibeId, userId, imageUrl, imageKey]
      );
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

  // DELETE /vibes/:id/reactions/photo - Remove photo reaction
  fastify.delete<{ Params: VibeParams }>('/:id/reactions/photo', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id: vibeId } = request.params;
    const { userId } = request.user;

    const result = await fastify.db.query(
      `DELETE FROM reactions WHERE vibe_id = $1 AND user_id = $2 AND reaction_type = 'photo' RETURNING id`,
      [vibeId, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Photo reaction not found' });
    }

    const countResult = await fastify.db.query(
      'SELECT COUNT(*) as count FROM reactions WHERE vibe_id = $1',
      [vibeId]
    );

    return {
      success: true,
      reactionCount: parseInt(countResult.rows[0].count, 10),
    };
  });

  // GET /vibes/:id/reactions - Get all reactions for a vibe
  fastify.get<{ Params: VibeParams }>('/:id/reactions', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id: vibeId } = request.params;

    // Check if vibe exists
    const vibeCheck = await fastify.db.query(
      'SELECT id FROM vibes WHERE id = $1',
      [vibeId]
    );

    if (vibeCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Vibe not found' });
    }

    const result = await fastify.db.query(
      `SELECT
        r.id,
        r.vibe_id,
        r.user_id,
        r.reaction_type,
        r.image_url,
        r.created_at,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.vibe_id = $1
       ORDER BY r.created_at DESC`,
      [vibeId]
    );

    const reactions: Reaction[] = result.rows.map((row) => ({
      id: row.id,
      vibeId: row.vibe_id,
      userId: row.user_id,
      reactionType: row.reaction_type || 'sparkle',
      imageUrl: row.image_url,
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
      sparkleCount: reactions.filter(r => r.reactionType === 'sparkle').length,
      photoCount: reactions.filter(r => r.reactionType === 'photo').length,
    };
  });
};

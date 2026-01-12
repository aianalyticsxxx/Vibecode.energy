import type { FastifyPluginAsync } from 'fastify';
import { CommentService } from '../../services/comment.service.js';

interface VibeIdParams {
  vibeId: string;
}

interface CommentIdParams {
  commentId: string;
}

interface GetCommentsQuery {
  cursor?: string;
  limit?: number;
}

interface AddCommentBody {
  content: string;
}

export const commentRoutes: FastifyPluginAsync = async (fastify) => {
  const commentService = new CommentService(fastify);

  // GET /vibes/:vibeId/comments - Get comments for a vibe
  fastify.get<{ Params: VibeIdParams; Querystring: GetCommentsQuery }>(
    '/:vibeId/comments',
    { preHandler: [fastify.optionalAuth] },
    async (request, reply) => {
      const { vibeId } = request.params;
      const { cursor, limit = 20 } = request.query;

      // Check if vibe exists
      const vibeCheck = await fastify.db.query(
        'SELECT id FROM vibes WHERE id = $1',
        [vibeId]
      );

      if (vibeCheck.rows.length === 0) {
        return reply.status(404).send({ error: 'Vibe not found' });
      }

      const result = await commentService.getComments(
        vibeId,
        cursor,
        Math.min(limit, 50)
      );

      return result;
    }
  );

  // POST /vibes/:vibeId/comments - Add a comment to a vibe
  fastify.post<{ Params: VibeIdParams; Body: AddCommentBody }>(
    '/:vibeId/comments',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { vibeId } = request.params;
      const { content } = request.body;
      const { userId } = request.user;

      // Validate content
      if (!content || content.trim().length === 0) {
        return reply.status(400).send({ error: 'Comment content is required' });
      }

      if (content.length > 280) {
        return reply.status(400).send({ error: 'Comment must be 280 characters or less' });
      }

      // Check if vibe exists
      const vibeCheck = await fastify.db.query(
        'SELECT id FROM vibes WHERE id = $1',
        [vibeId]
      );

      if (vibeCheck.rows.length === 0) {
        return reply.status(404).send({ error: 'Vibe not found' });
      }

      const comment = await commentService.addComment(vibeId, userId, content);
      const commentCount = await commentService.getCommentCount(vibeId);

      return reply.status(201).send({ comment, commentCount });
    }
  );

  // DELETE /vibes/:vibeId/comments/:commentId - Delete a comment
  fastify.delete<{ Params: VibeIdParams & CommentIdParams }>(
    '/:vibeId/comments/:commentId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { vibeId, commentId } = request.params;
      const { userId } = request.user;

      const deleted = await commentService.deleteComment(commentId, userId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Comment not found or not authorized' });
      }

      const commentCount = await commentService.getCommentCount(vibeId);

      return { success: true, commentCount };
    }
  );
};

import type { FastifyPluginAsync } from 'fastify';
import { CommentService } from '../../services/comment.service.js';

interface ShotIdParams {
  shotId: string;
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

  // GET /shots/:shotId/comments - Get comments for a shot
  fastify.get<{ Params: ShotIdParams; Querystring: GetCommentsQuery }>(
    '/:shotId/comments',
    { preHandler: [fastify.optionalAuth] },
    async (request, reply) => {
      const { shotId } = request.params;
      const { cursor, limit = 20 } = request.query;

      // Check if shot exists
      const shotCheck = await fastify.db.query(
        'SELECT id FROM shots WHERE id = $1',
        [shotId]
      );

      if (shotCheck.rows.length === 0) {
        return reply.status(404).send({ error: 'Shot not found' });
      }

      const result = await commentService.getComments(
        shotId,
        cursor,
        Math.min(limit, 50)
      );

      return result;
    }
  );

  // POST /shots/:shotId/comments - Add a comment to a shot
  fastify.post<{ Params: ShotIdParams; Body: AddCommentBody }>(
    '/:shotId/comments',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { shotId } = request.params;
      const { content } = request.body;
      const { userId } = request.user;

      // Validate content
      if (!content || content.trim().length === 0) {
        return reply.status(400).send({ error: 'Comment content is required' });
      }

      if (content.length > 280) {
        return reply.status(400).send({ error: 'Comment must be 280 characters or less' });
      }

      // Check if shot exists
      const shotCheck = await fastify.db.query(
        'SELECT id FROM shots WHERE id = $1',
        [shotId]
      );

      if (shotCheck.rows.length === 0) {
        return reply.status(404).send({ error: 'Shot not found' });
      }

      const comment = await commentService.addComment(shotId, userId, content);
      const commentCount = await commentService.getCommentCount(shotId);

      return reply.status(201).send({ comment, commentCount });
    }
  );

  // DELETE /shots/:shotId/comments/:commentId - Delete a comment
  fastify.delete<{ Params: ShotIdParams & CommentIdParams }>(
    '/:shotId/comments/:commentId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { shotId, commentId } = request.params;
      const { userId } = request.user;

      const deleted = await commentService.deleteComment(commentId, userId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Comment not found or not authorized' });
      }

      const commentCount = await commentService.getCommentCount(shotId);

      return { success: true, commentCount };
    }
  );
};

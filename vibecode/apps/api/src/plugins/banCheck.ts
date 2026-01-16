import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    requireNotBanned: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const banCheckPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Middleware to check if user is banned (deleted_at IS NOT NULL)
   * Must be used AFTER authenticate middleware
   */
  fastify.decorate('requireNotBanned', async function (request: FastifyRequest, reply: FastifyReply) {
    // If no user is set, authentication middleware will handle it
    if (!request.user?.userId) {
      return;
    }

    try {
      const result = await fastify.db.query(
        'SELECT deleted_at FROM users WHERE id = $1',
        [request.user.userId]
      );

      // User not found
      if (result.rows.length === 0) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // User is banned (has deleted_at timestamp)
      if (result.rows[0].deleted_at) {
        return reply.status(403).send({
          error: 'Your account has been suspended due to a policy violation',
        });
      }
    } catch (err) {
      fastify.log.error({ err, userId: request.user.userId }, 'Error checking ban status');
      // On error, allow through (fail open) - other validations will catch issues
    }
  });
};

export const banCheckPlugin = fp(banCheckPluginAsync, {
  name: 'ban-check-plugin',
  dependencies: ['db-plugin', 'auth-plugin'],
});

import type { FastifyPluginAsync } from 'fastify';
import { PresenceService } from '../../services/presence.service.js';

export const presenceRoutes: FastifyPluginAsync = async (fastify) => {
  const presenceService = new PresenceService(fastify);

  // PATCH /users/me/presence - Update current user's presence
  fastify.patch('/me/presence', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { userId } = request.user;
    await presenceService.updatePresence(userId);
    return { success: true };
  });

  // GET /users/me/following/online - Get online users from following list
  fastify.get('/me/following/online', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { userId } = request.user;
    const onlineUsers = await presenceService.getOnlineFollowing(userId);
    return { users: onlineUsers };
  });
};

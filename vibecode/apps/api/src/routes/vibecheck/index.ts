import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VibecheckService } from '../../services/vibecheck.service.js';

export async function vibecheckRoutes(fastify: FastifyInstance) {
  const vibecheckService = new VibecheckService(fastify);

  /**
   * GET /vibecheck/today
   * Get today's vibecheck status for the current user
   */
  fastify.get(
    '/today',
    {
      onRequest: [fastify.optionalAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              vibecheck: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  vibecheckDate: { type: 'string' },
                  triggerTime: { type: 'string' },
                  windowEndTime: { type: 'string' },
                },
              },
              status: { type: 'string', enum: ['waiting', 'active', 'late', 'closed'] },
              timeRemainingSeconds: { type: ['number', 'null'] },
              hasPostedToday: { type: 'boolean' },
              userPostIsLate: { type: ['boolean', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.userId;

      if (userId) {
        const status = await vibecheckService.getUserVibecheckStatus(userId);
        return reply.send({
          vibecheck: status.vibecheck
            ? {
                id: status.vibecheck.id,
                vibecheckDate: status.vibecheck.vibecheckDate,
                triggerTime: status.vibecheck.triggerTime.toISOString(),
                windowEndTime: status.vibecheck.windowEndTime.toISOString(),
              }
            : null,
          status: status.status,
          timeRemainingSeconds: status.timeRemainingSeconds,
          hasPostedToday: status.hasPostedToday,
          userPostIsLate: status.userPostIsLate,
        });
      }

      // For unauthenticated users, just return vibecheck info
      const vibecheck = await vibecheckService.getTodaysVibecheck();
      if (!vibecheck) {
        return reply.send({
          vibecheck: null,
          status: 'waiting',
          timeRemainingSeconds: null,
          hasPostedToday: false,
          userPostIsLate: null,
        });
      }

      const status = vibecheckService.getCurrentStatus(vibecheck);
      const timeRemainingSeconds = vibecheckService.getTimeRemaining(vibecheck);

      return reply.send({
        vibecheck: {
          id: vibecheck.id,
          vibecheckDate: vibecheck.vibecheckDate,
          triggerTime: vibecheck.triggerTime.toISOString(),
          windowEndTime: vibecheck.windowEndTime.toISOString(),
        },
        status,
        timeRemainingSeconds,
        hasPostedToday: false,
        userPostIsLate: null,
      });
    }
  );

  /**
   * POST /vibecheck/generate
   * Generate today's vibecheck (for cron job or admin)
   * In production, this should be protected or triggered by a cron service
   */
  fastify.post(
    '/generate',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              vibecheckDate: { type: 'string' },
              triggerTime: { type: 'string' },
              windowEndTime: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const vibecheck = await vibecheckService.generateTodaysVibecheck();

      return reply.send({
        id: vibecheck.id,
        vibecheckDate: vibecheck.vibecheckDate,
        triggerTime: vibecheck.triggerTime.toISOString(),
        windowEndTime: vibecheck.windowEndTime.toISOString(),
        createdAt: vibecheck.createdAt.toISOString(),
      });
    }
  );
}

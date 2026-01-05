import type { FastifyPluginAsync } from 'fastify';
import { UserService } from '../../services/user.service.js';
import { StreakService } from '../../services/streak.service.js';
import { userSchemas } from '../../schemas/user.schemas.js';

interface UsernameParams {
  username: string;
}

interface GetUserVibesQuery {
  cursor?: string;
  limit?: number;
}

interface UpdateUserBody {
  displayName?: string;
  bio?: string;
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService(fastify);
  const streakService = new StreakService(fastify);

  // GET /users/:username - Get user profile
  fastify.get<{ Params: UsernameParams }>('/:username', {
    preHandler: [fastify.optionalAuth],
    schema: userSchemas.getUser,
  }, async (request, reply) => {
    const { username } = request.params;
    const currentUserId = request.user?.userId;

    const user = await userService.getByUsername(username, currentUserId);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return user;
  });

  // GET /users/:username/vibes - Get user's vibe history
  fastify.get<{ Params: UsernameParams; Querystring: GetUserVibesQuery }>('/:username/vibes', {
    preHandler: [fastify.optionalAuth],
    schema: userSchemas.getUserVibes,
  }, async (request, reply) => {
    const { username } = request.params;
    const { cursor, limit = 20 } = request.query;
    const currentUserId = request.user?.userId;

    // First check if user exists
    const user = await userService.getByUsername(username);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const vibes = await userService.getUserVibes({
      userId: user.id,
      cursor,
      limit: Math.min(limit, 50),
      currentUserId,
    });

    return vibes;
  });

  // PATCH /users/me - Update current user's profile
  fastify.patch<{ Body: UpdateUserBody }>('/me', {
    preHandler: [fastify.authenticate],
    schema: userSchemas.updateUser,
  }, async (request, reply) => {
    const { userId } = request.user;
    const { displayName, bio } = request.body;

    // Validate inputs
    if (displayName !== undefined && displayName.length > 100) {
      return reply.status(400).send({ error: 'Display name must be 100 characters or less' });
    }

    if (bio !== undefined && bio.length > 500) {
      return reply.status(400).send({ error: 'Bio must be 500 characters or less' });
    }

    const updatedUser = await userService.updateProfile(userId, {
      displayName,
      bio,
    });

    if (!updatedUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return updatedUser;
  });

  // GET /users/:username/streak - Get user's streak info
  fastify.get<{ Params: UsernameParams }>('/:username/streak', async (request, reply) => {
    const { username } = request.params;

    const streak = await streakService.getStreakByUsername(username);

    if (!streak) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const milestone = streakService.getStreakMilestone(streak.currentStreak);
    const nextMilestone = streakService.getNextMilestone(streak.currentStreak);

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastPostDate: streak.lastPostDate,
      streakStartedAt: streak.streakStartedAt,
      milestone: milestone ? {
        days: milestone.days,
        name: milestone.name,
        emoji: milestone.emoji,
      } : null,
      nextMilestone: nextMilestone ? {
        days: nextMilestone.days,
        name: nextMilestone.name,
        emoji: nextMilestone.emoji,
        daysRemaining: nextMilestone.days - streak.currentStreak,
      } : null,
    };
  });

  // GET /streaks/leaderboard - Get top streaks
  fastify.get('/streaks/leaderboard', async (request, _reply) => {
    const leaderboard = await streakService.getLeaderboard(10);

    return {
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        username: entry.username,
        displayName: entry.displayName,
        avatarUrl: entry.avatarUrl,
        currentStreak: entry.currentStreak,
        milestone: streakService.getStreakMilestone(entry.currentStreak),
      })),
    };
  });
};

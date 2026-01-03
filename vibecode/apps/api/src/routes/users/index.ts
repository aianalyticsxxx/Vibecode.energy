import type { FastifyPluginAsync } from 'fastify';
import { UserService } from '../../services/user.service.js';
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
};

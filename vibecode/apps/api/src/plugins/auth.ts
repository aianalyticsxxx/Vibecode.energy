import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
  userId: string;
  username: string;
  type: 'access' | 'refresh';
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

const authPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Decorator for required authentication
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // First try cookie, then header
      let token = request.cookies.access_token;

      if (!token) {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }

      if (!token) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const decoded = fastify.jwt.verify<JwtPayload>(token);

      if (decoded.type !== 'access') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      request.user = decoded;
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });

  // Decorator for optional authentication (doesn't fail if no token)
  fastify.decorate('optionalAuth', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      let token = request.cookies.access_token;

      if (!token) {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }

      if (token) {
        const decoded = fastify.jwt.verify<JwtPayload>(token);
        if (decoded.type === 'access') {
          request.user = decoded;
        }
      }
    } catch {
      // Ignore errors for optional auth
    }
  });
};

export const authPlugin = fp(authPluginAsync, {
  name: 'auth-plugin',
  dependencies: ['@fastify/jwt', '@fastify/cookie'],
});

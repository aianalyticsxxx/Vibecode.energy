import fp from 'fastify-plugin';
import pg from 'pg';
import type { FastifyPluginAsync, FastifyInstance } from 'fastify';

const { Pool } = pg;

declare module 'fastify' {
  interface FastifyInstance {
    db: pg.Pool;
  }
}

const dbPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test the connection
  try {
    const client = await pool.connect();
    fastify.log.info('Database connection established');
    client.release();
  } catch (err) {
    fastify.log.error('Database connection failed:', err);
    throw err;
  }

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
    fastify.log.info('Database connection pool closed');
  });
};

export const dbPlugin = fp(dbPluginAsync, {
  name: 'db-plugin',
});

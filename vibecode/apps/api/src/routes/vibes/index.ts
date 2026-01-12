import type { FastifyPluginAsync } from 'fastify';
import { VibeService } from '../../services/vibe.service.js';
import { UploadService } from '../../services/upload.service.js';

interface CreateVibeBody {
  imageUrl: string;
  imageKey: string;
  caption?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface GetVibesQuery {
  cursor?: string;
  limit?: number;
}

interface DiscoveryQuery extends GetVibesQuery {
  sort?: 'recent' | 'popular';
}

interface VibeParams {
  id: string;
}

export const vibeRoutes: FastifyPluginAsync = async (fastify) => {
  const vibeService = new VibeService(fastify);
  const uploadService = new UploadService(fastify);

  // GET /vibes - Chronological feed with cursor pagination
  fastify.get<{ Querystring: GetVibesQuery }>('/', {
    preHandler: [fastify.optionalAuth],
  }, async (request, _reply) => {
    const { cursor, limit = 20 } = request.query;
    const userId = request.user?.userId;

    const vibes = await vibeService.getFeed({
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
    });

    return vibes;
  });

  // GET /vibes/today - Check if user posted today
  fastify.get('/today', {
    preHandler: [fastify.authenticate],
  }, async (request, _reply) => {
    const { userId } = request.user;
    const todayVibe = await vibeService.getTodayVibe(userId);

    return {
      hasPostedToday: !!todayVibe,
      vibe: todayVibe,
    };
  });

  // GET /vibes/discovery - Global discovery feed
  fastify.get<{ Querystring: DiscoveryQuery }>('/discovery', {
    preHandler: [fastify.optionalAuth],
  }, async (request, _reply) => {
    const { cursor, limit = 20, sort = 'recent' } = request.query;
    const userId = request.user?.userId;

    const vibes = await vibeService.getDiscoveryFeed({
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
      sort,
    });

    return vibes;
  });

  // GET /vibes/following - Feed of vibes from followed users
  fastify.get<{ Querystring: GetVibesQuery }>('/following', {
    preHandler: [fastify.authenticate],
  }, async (request, _reply) => {
    const { cursor, limit = 20 } = request.query;
    const { userId } = request.user;

    const vibes = await vibeService.getFollowingFeed({
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
    });

    return vibes;
  });

  // GET /vibes/:id - Get single vibe
  fastify.get<{ Params: VibeParams }>('/:id', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user?.userId;

    const vibe = await vibeService.getById(id, userId);

    if (!vibe) {
      return reply.status(404).send({ error: 'Vibe not found' });
    }

    return vibe;
  });

  // POST /vibes - Create or replace today's vibe (supports multipart and JSON)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.user;

    let imageUrl: string;
    let imageKey: string;
    let caption: string | undefined;

    // Check if this is a multipart request
    const contentType = request.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart file upload
      try {
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({ error: 'No file uploaded' });
        }

        // Validate file type
        if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
          return reply.status(400).send({
            error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP'
          });
        }

        // Get the file buffer
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Upload to S3
        const uploaded = await uploadService.uploadBuffer({
          userId,
          buffer,
          contentType: data.mimetype,
          fileName: data.filename,
        });

        imageUrl = uploaded.fileUrl;
        imageKey = uploaded.key;

        // Get caption from fields if provided
        // Note: For multipart, we need to access fields differently
        const fields = data.fields;
        if (fields.caption && typeof fields.caption === 'object' && 'value' in fields.caption) {
          caption = (fields.caption as { value: string }).value;
        }
      } catch (err) {
        const error = err as Error;
        fastify.log.error({
          message: error.message,
          name: error.name,
          stack: error.stack,
          s3Config: {
            bucket: fastify.s3Config.bucket,
            region: fastify.s3Config.region,
            endpoint: fastify.s3Config.endpoint,
            hasPublicUrl: !!fastify.s3Config.publicUrl,
          }
        }, 'Error processing file upload');
        return reply.status(500).send({ error: `Failed to process upload: ${error.message}` });
      }
    } else {
      // Handle JSON body (pre-uploaded to S3)
      const body = request.body as CreateVibeBody;

      if (!body.imageUrl || !body.imageKey) {
        return reply.status(400).send({ error: 'Image URL and key are required' });
      }

      imageUrl = body.imageUrl;
      imageKey = body.imageKey;
      caption = body.caption;
    }

    try {
      const vibe = await vibeService.createOrReplaceTodayVibe({
        userId,
        imageUrl,
        imageKey,
        caption: caption?.trim(),
      });

      return reply.status(201).send(vibe);
    } catch (err) {
      fastify.log.error({ err }, 'Error creating vibe');
      return reply.status(500).send({ error: 'Failed to create vibe' });
    }
  });

  // DELETE /vibes/:id - Delete own vibe
  fastify.delete<{ Params: VibeParams }>('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.user;

    const deleted = await vibeService.delete(id, userId);

    if (!deleted) {
      return reply.status(404).send({ error: 'Vibe not found or not authorized' });
    }

    return { success: true };
  });
};

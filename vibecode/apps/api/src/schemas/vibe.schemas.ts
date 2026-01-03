export const vibeSchemas = {
  getVibes: {
    querystring: {
      type: 'object',
      properties: {
        cursor: { type: 'string', format: 'date-time' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          vibes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                content: { type: 'string' },
                mediaUrl: { type: 'string', nullable: true },
                mediaType: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                author: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    username: { type: 'string' },
                    displayName: { type: 'string' },
                    avatarUrl: { type: 'string', nullable: true },
                  },
                },
                reactionCount: { type: 'integer' },
                hasReacted: { type: 'boolean' },
              },
            },
          },
          nextCursor: { type: 'string', nullable: true },
          hasMore: { type: 'boolean' },
        },
      },
    },
  },

  getVibe: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          mediaUrl: { type: 'string', nullable: true },
          mediaType: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              displayName: { type: 'string' },
              avatarUrl: { type: 'string', nullable: true },
            },
          },
          reactionCount: { type: 'integer' },
          hasReacted: { type: 'boolean' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },

  createVibe: {
    body: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 500 },
        mediaUrl: { type: 'string', format: 'uri' },
        mediaType: { type: 'string', enum: ['image', 'video'] },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          mediaUrl: { type: 'string', nullable: true },
          mediaType: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              displayName: { type: 'string' },
              avatarUrl: { type: 'string', nullable: true },
            },
          },
          reactionCount: { type: 'integer' },
          hasReacted: { type: 'boolean' },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },

  deleteVibe: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
};

export const userSchemas = {
  getUser: {
    params: {
      type: 'object',
      required: ['username'],
      properties: {
        username: { type: 'string', minLength: 1, maxLength: 39 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          displayName: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          vibeCount: { type: 'integer' },
          streakCount: { type: 'integer' },
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

  getUserVibes: {
    params: {
      type: 'object',
      required: ['username'],
      properties: {
        username: { type: 'string', minLength: 1, maxLength: 39 },
      },
    },
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
                reactionCount: { type: 'integer' },
                hasReacted: { type: 'boolean' },
              },
            },
          },
          nextCursor: { type: 'string', nullable: true },
          hasMore: { type: 'boolean' },
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

  updateUser: {
    body: {
      type: 'object',
      properties: {
        displayName: { type: 'string', minLength: 1, maxLength: 100 },
        bio: { type: 'string', maxLength: 500 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          displayName: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          vibeCount: { type: 'integer' },
          streakCount: { type: 'integer' },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
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

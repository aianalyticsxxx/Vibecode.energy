export const uploadSchemas = {
  getPresignedUrl: {
    body: {
      type: 'object',
      required: ['fileName', 'contentType', 'fileSize'],
      properties: {
        fileName: { type: 'string', minLength: 1, maxLength: 255 },
        contentType: {
          type: 'string',
          enum: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/webm',
            'video/quicktime',
          ],
        },
        fileSize: { type: 'integer', minimum: 1, maximum: 52428800 }, // 50MB
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          uploadUrl: { type: 'string', format: 'uri' },
          fileUrl: { type: 'string', format: 'uri' },
          key: { type: 'string' },
          expiresIn: { type: 'integer' },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          allowedTypes: {
            type: 'array',
            items: { type: 'string' },
          },
          maxSize: { type: 'integer' },
        },
      },
    },
  },
};

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import path from 'path';

interface PresignedUrlOptions {
  userId: string;
  fileName: string;
  contentType: string;
}

interface PresignedUrlResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
}

export class UploadService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Generate a presigned URL for uploading to S3
   */
  async generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResult> {
    const { userId, fileName, contentType } = options;

    // Generate unique key
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const ext = path.extname(fileName);
    const key = `vibes/${userId}/${timestamp}-${randomId}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.fastify.s3Config.bucket,
      Key: key,
      ContentType: contentType,
      // Add metadata for tracking
      Metadata: {
        'user-id': userId,
        'original-name': fileName,
      },
    });

    const expiresIn = 3600; // 1 hour
    const uploadUrl = await getSignedUrl(this.fastify.s3, command, { expiresIn });

    // Generate the public URL for the file
    const fileUrl = this.fastify.s3Config.cdnUrl
      ? `${this.fastify.s3Config.cdnUrl}/${key}`
      : `https://${this.fastify.s3Config.bucket}.s3.${this.fastify.s3Config.region}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
      expiresIn,
    };
  }

  /**
   * Upload a file buffer directly to S3
   */
  async uploadBuffer(options: {
    userId: string;
    buffer: Buffer;
    contentType: string;
    fileName?: string;
  }): Promise<{ fileUrl: string; key: string }> {
    const { userId, buffer, contentType, fileName } = options;

    // Generate unique key
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const ext = fileName ? path.extname(fileName) : this.getExtensionFromContentType(contentType);
    const key = `vibes/${userId}/${timestamp}-${randomId}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.fastify.s3Config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        'user-id': userId,
      },
    });

    await this.fastify.s3.send(command);

    // Generate the public URL for the file
    const fileUrl = this.fastify.s3Config.cdnUrl
      ? `${this.fastify.s3Config.cdnUrl}/${key}`
      : `https://${this.fastify.s3Config.bucket}.s3.${this.fastify.s3Config.region}.amazonaws.com/${key}`;

    return { fileUrl, key };
  }

  private getExtensionFromContentType(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return map[contentType] || '.jpg';
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    await this.fastify.s3.send(new DeleteObjectCommand({
      Bucket: this.fastify.s3Config.bucket,
      Key: key,
    }));
  }

  /**
   * Extract key from file URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // Handle CDN URL
      if (this.fastify.s3Config.cdnUrl && url.startsWith(this.fastify.s3Config.cdnUrl)) {
        return urlObj.pathname.slice(1); // Remove leading slash
      }

      // Handle S3 URL
      const s3UrlPattern = new RegExp(
        `^https://${this.fastify.s3Config.bucket}\\.s3\\.${this.fastify.s3Config.region}\\.amazonaws\\.com/(.+)$`
      );
      const match = url.match(s3UrlPattern);

      if (match) {
        return match[1];
      }

      return null;
    } catch {
      return null;
    }
  }
}

import type { FastifyInstance } from 'fastify';

interface Comment {
  id: string;
  vibeId: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface CommentListResult {
  comments: Comment[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

export class CommentService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Add a comment to a vibe
   */
  async addComment(
    vibeId: string,
    userId: string,
    content: string
  ): Promise<Comment> {
    const result = await this.fastify.db.query(
      `INSERT INTO comments (vibe_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [vibeId, userId, content.trim()]
    );

    const commentId = result.rows[0].id;

    // Fetch the complete comment with user info
    const comment = await this.getById(commentId);
    if (!comment) {
      throw new Error('Failed to fetch created comment');
    }

    return comment;
  }

  /**
   * Get a single comment by ID
   */
  async getById(commentId: string): Promise<Comment | null> {
    const result = await this.fastify.db.query(
      `SELECT
        c.id,
        c.vibe_id,
        c.content,
        c.created_at,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1`,
      [commentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapCommentRow(result.rows[0]);
  }

  /**
   * Get comments for a vibe with pagination (oldest first)
   */
  async getComments(
    vibeId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<CommentListResult> {
    const params: (string | number)[] = [vibeId, limit + 1];
    let cursorCondition = '';

    if (cursor) {
      // For oldest-first, we want comments AFTER the cursor
      cursorCondition = 'AND c.created_at > $3';
      params.push(cursor);
    }

    const result = await this.fastify.db.query(
      `SELECT
        c.id,
        c.vibe_id,
        c.content,
        c.created_at,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.vibe_id = $1 ${cursorCondition}
      ORDER BY c.created_at ASC
      LIMIT $2`,
      params
    );

    // Get total count
    const countResult = await this.fastify.db.query(
      'SELECT COUNT(*) as total FROM comments WHERE vibe_id = $1',
      [vibeId]
    );
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    const hasMore = result.rows.length > limit;
    const comments = result.rows.slice(0, limit).map(this.mapCommentRow);
    const lastComment = comments[comments.length - 1];
    const nextCursor = hasMore && lastComment
      ? lastComment.createdAt.toISOString()
      : undefined;

    return { comments, nextCursor, hasMore, total };
  }

  /**
   * Delete a comment (only by owner)
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `DELETE FROM comments
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [commentId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get comment count for a vibe
   */
  async getCommentCount(vibeId: string): Promise<number> {
    const result = await this.fastify.db.query(
      'SELECT COUNT(*) as count FROM comments WHERE vibe_id = $1',
      [vibeId]
    );
    return parseInt(result.rows[0].count, 10) || 0;
  }

  private mapCommentRow(row: Record<string, unknown>): Comment {
    return {
      id: row.id as string,
      vibeId: row.vibe_id as string,
      content: row.content as string,
      createdAt: new Date(row.created_at as string),
      user: {
        id: row.user_id as string,
        username: row.username as string,
        displayName: row.display_name as string,
        avatarUrl: row.avatar_url as string | undefined,
      },
    };
  }
}

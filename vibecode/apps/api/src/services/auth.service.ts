import type { FastifyInstance } from 'fastify';

interface GitHubUserData {
  githubId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

interface TokenPayload {
  userId: string;
  username: string;
}

interface User {
  id: string;
  githubId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Upsert a user from GitHub OAuth data
   */
  async upsertGitHubUser(userData: GitHubUserData): Promise<User> {
    const { githubId, username, displayName, avatarUrl, email } = userData;

    const result = await this.fastify.db.query(
      `INSERT INTO users (github_id, username, display_name, avatar_url, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (github_id) DO UPDATE SET
         username = EXCLUDED.username,
         display_name = COALESCE(users.display_name, EXCLUDED.display_name),
         avatar_url = EXCLUDED.avatar_url,
         email = COALESCE(EXCLUDED.email, users.email),
         updated_at = NOW()
       RETURNING id, github_id, username, display_name, avatar_url, email`,
      [githubId, username, displayName, avatarUrl, email]
    );

    const user = result.rows[0];
    return {
      id: user.id,
      githubId: user.github_id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      email: user.email,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokens(payload: TokenPayload): { accessToken: string; refreshToken: string } {
    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

    const accessToken = this.fastify.jwt.sign(
      { ...payload, type: 'access' },
      { expiresIn: accessExpiry }
    );

    const refreshToken = this.fastify.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: refreshExpiry }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await this.fastify.db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  }

  /**
   * Validate that a refresh token exists and is valid
   */
  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `SELECT id FROM refresh_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW() AND revoked_at IS NULL`,
      [userId, token]
    );

    return result.rows.length > 0;
  }

  /**
   * Rotate refresh token - revoke old one and store new one
   */
  async rotateRefreshToken(userId: string, oldToken: string, newToken: string): Promise<void> {
    // Start a transaction
    const client = await this.fastify.db.connect();

    try {
      await client.query('BEGIN');

      // Revoke old token
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = $1 AND token = $2`,
        [userId, oldToken]
      );

      // Store new token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, newToken, expiresAt]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout everywhere)
   */
  async revokeAllTokens(userId: string): Promise<void> {
    await this.fastify.db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.fastify.db.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL`
    );

    return result.rowCount ?? 0;
  }
}

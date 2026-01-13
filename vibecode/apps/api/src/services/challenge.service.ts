import type { FastifyInstance } from 'fastify';

interface Challenge {
  id: string;
  title: string;
  description?: string;
  createdBy?: string;
  isOfficial: boolean;
  isSponsored: boolean;
  sponsorName?: string;
  prizeDescription?: string;
  startsAt: Date;
  endsAt: Date;
  votingEndsAt?: Date;
  createdAt: Date;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  submissionCount?: number;
}

interface CreateChallengeData {
  title: string;
  description?: string;
  createdBy?: string;
  isOfficial?: boolean;
  isSponsored?: boolean;
  sponsorName?: string;
  prizeDescription?: string;
  startsAt: Date;
  endsAt: Date;
  votingEndsAt?: Date;
}

interface VoteData {
  shotId: string;
  userId: string;
  creativityScore: number;
  usefulnessScore: number;
  qualityScore: number;
}

interface Vote {
  id: string;
  shotId: string;
  userId: string;
  creativityScore: number;
  usefulnessScore: number;
  qualityScore: number;
  createdAt: Date;
}

interface LeaderboardEntry {
  rank: number;
  shotId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  prompt: string;
  imageUrl: string;
  averageScore: number;
  voteCount: number;
  totalScore: number;
}

export class ChallengeService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Create a new challenge
   */
  async create(data: CreateChallengeData): Promise<Challenge> {
    const {
      title,
      description,
      createdBy,
      isOfficial = false,
      isSponsored = false,
      sponsorName,
      prizeDescription,
      startsAt,
      endsAt,
      votingEndsAt
    } = data;

    const result = await this.fastify.db.query(
      `INSERT INTO challenges (title, description, created_by, is_official, is_sponsored, sponsor_name, prize_description, starts_at, ends_at, voting_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [title, description, createdBy, isOfficial, isSponsored, sponsorName, prizeDescription, startsAt, endsAt, votingEndsAt]
    );

    return this.mapChallengeRow(result.rows[0]);
  }

  /**
   * Get a challenge by ID
   */
  async getById(id: string): Promise<Challenge | null> {
    const result = await this.fastify.db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM shots s WHERE s.challenge_id = c.id) as submission_count
       FROM challenges c
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapChallengeRow(result.rows[0]);
  }

  /**
   * Get all active challenges
   */
  async getActive(): Promise<Challenge[]> {
    const now = new Date().toISOString();

    const result = await this.fastify.db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM shots s WHERE s.challenge_id = c.id) as submission_count
       FROM challenges c
       WHERE c.starts_at <= $1 AND (c.voting_ends_at IS NULL OR c.voting_ends_at >= $1 OR c.ends_at >= $1)
       ORDER BY c.is_official DESC, c.starts_at DESC`,
      [now]
    );

    return result.rows.map(this.mapChallengeRow.bind(this));
  }

  /**
   * Get upcoming challenges
   */
  async getUpcoming(): Promise<Challenge[]> {
    const now = new Date().toISOString();

    const result = await this.fastify.db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM shots s WHERE s.challenge_id = c.id) as submission_count
       FROM challenges c
       WHERE c.starts_at > $1
       ORDER BY c.starts_at ASC`,
      [now]
    );

    return result.rows.map(this.mapChallengeRow.bind(this));
  }

  /**
   * Get completed challenges
   */
  async getCompleted(limit: number = 10): Promise<Challenge[]> {
    const now = new Date().toISOString();

    const result = await this.fastify.db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM shots s WHERE s.challenge_id = c.id) as submission_count
       FROM challenges c
       WHERE (c.voting_ends_at IS NOT NULL AND c.voting_ends_at < $1) OR (c.voting_ends_at IS NULL AND c.ends_at < $1)
       ORDER BY c.ends_at DESC
       LIMIT $2`,
      [now, limit]
    );

    return result.rows.map(this.mapChallengeRow.bind(this));
  }

  /**
   * Get all challenges (paginated)
   */
  async getAll(cursor?: string, limit: number = 20): Promise<{ challenges: Challenge[]; nextCursor?: string; hasMore: boolean }> {
    const params: (string | number)[] = [];
    let paramIndex = 1;

    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `WHERE c.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    params.push(limit + 1);

    const result = await this.fastify.db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM shots s WHERE s.challenge_id = c.id) as submission_count
       FROM challenges c
       ${cursorCondition}
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = result.rows.length > limit;
    const challenges = result.rows.slice(0, limit).map(this.mapChallengeRow.bind(this));
    const lastChallenge = challenges[challenges.length - 1];
    const nextCursor = hasMore && lastChallenge
      ? lastChallenge.createdAt.toISOString()
      : undefined;

    return {
      challenges,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Vote on a shot in a challenge
   */
  async vote(data: VoteData): Promise<Vote> {
    const { shotId, userId, creativityScore, usefulnessScore, qualityScore } = data;

    // Verify scores are in valid range
    if (creativityScore < 1 || creativityScore > 5 ||
        usefulnessScore < 1 || usefulnessScore > 5 ||
        qualityScore < 1 || qualityScore > 5) {
      throw new Error('Scores must be between 1 and 5');
    }

    // Verify shot exists and is in a challenge
    const shotResult = await this.fastify.db.query(
      `SELECT challenge_id, user_id FROM shots WHERE id = $1`,
      [shotId]
    );

    if (shotResult.rows.length === 0) {
      throw new Error('Shot not found');
    }

    if (!shotResult.rows[0].challenge_id) {
      throw new Error('Shot is not part of a challenge');
    }

    // Prevent self-voting
    if (shotResult.rows[0].user_id === userId) {
      throw new Error('Cannot vote on your own submission');
    }

    // Upsert vote
    const result = await this.fastify.db.query(
      `INSERT INTO challenge_votes (shot_id, user_id, creativity_score, usefulness_score, quality_score)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (shot_id, user_id)
       DO UPDATE SET
         creativity_score = EXCLUDED.creativity_score,
         usefulness_score = EXCLUDED.usefulness_score,
         quality_score = EXCLUDED.quality_score,
         updated_at = NOW()
       RETURNING *`,
      [shotId, userId, creativityScore, usefulnessScore, qualityScore]
    );

    return this.mapVoteRow(result.rows[0]);
  }

  /**
   * Get user's vote for a shot
   */
  async getUserVote(shotId: string, userId: string): Promise<Vote | null> {
    const result = await this.fastify.db.query(
      `SELECT * FROM challenge_votes WHERE shot_id = $1 AND user_id = $2`,
      [shotId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapVoteRow(result.rows[0]);
  }

  /**
   * Get leaderboard for a challenge
   */
  async getLeaderboard(challengeId: string, limit: number = 20): Promise<LeaderboardEntry[]> {
    const result = await this.fastify.db.query(
      `SELECT
        s.id as shot_id,
        s.user_id,
        s.prompt,
        s.image_url,
        u.username,
        u.display_name,
        u.avatar_url,
        COUNT(v.id) as vote_count,
        COALESCE(AVG((v.creativity_score + v.usefulness_score + v.quality_score) / 3.0), 0) as average_score,
        COALESCE(SUM(v.creativity_score + v.usefulness_score + v.quality_score), 0) as total_score
       FROM shots s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN challenge_votes v ON v.shot_id = s.id
       WHERE s.challenge_id = $1
       GROUP BY s.id, u.id
       ORDER BY average_score DESC, vote_count DESC, s.created_at ASC
       LIMIT $2`,
      [challengeId, limit]
    );

    return result.rows.map((row, index) => ({
      rank: index + 1,
      shotId: row.shot_id as string,
      userId: row.user_id as string,
      username: row.username as string,
      displayName: row.display_name as string,
      avatarUrl: row.avatar_url as string | undefined,
      prompt: row.prompt as string,
      imageUrl: row.image_url as string,
      averageScore: parseFloat(row.average_score) || 0,
      voteCount: parseInt(row.vote_count, 10) || 0,
      totalScore: parseInt(row.total_score, 10) || 0,
    }));
  }

  /**
   * Get challenge status based on dates
   */
  private getChallengeStatus(row: Record<string, unknown>): 'upcoming' | 'active' | 'voting' | 'completed' {
    const now = new Date();
    const startsAt = new Date(row.starts_at as string);
    const endsAt = new Date(row.ends_at as string);
    const votingEndsAt = row.voting_ends_at ? new Date(row.voting_ends_at as string) : null;

    if (now < startsAt) {
      return 'upcoming';
    }

    if (now >= startsAt && now <= endsAt) {
      return 'active';
    }

    if (votingEndsAt && now > endsAt && now <= votingEndsAt) {
      return 'voting';
    }

    return 'completed';
  }

  /**
   * Map database row to Challenge object
   */
  private mapChallengeRow(row: Record<string, unknown>): Challenge {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      createdBy: row.created_by as string | undefined,
      isOfficial: row.is_official as boolean,
      isSponsored: row.is_sponsored as boolean,
      sponsorName: row.sponsor_name as string | undefined,
      prizeDescription: row.prize_description as string | undefined,
      startsAt: new Date(row.starts_at as string),
      endsAt: new Date(row.ends_at as string),
      votingEndsAt: row.voting_ends_at ? new Date(row.voting_ends_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      status: this.getChallengeStatus(row),
      submissionCount: row.submission_count ? parseInt(row.submission_count as string, 10) : undefined,
    };
  }

  /**
   * Map database row to Vote object
   */
  private mapVoteRow(row: Record<string, unknown>): Vote {
    return {
      id: row.id as string,
      shotId: row.shot_id as string,
      userId: row.user_id as string,
      creativityScore: row.creativity_score as number,
      usefulnessScore: row.usefulness_score as number,
      qualityScore: row.quality_score as number,
      createdAt: new Date(row.created_at as string),
    };
  }
}

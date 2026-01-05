import type { FastifyInstance } from 'fastify';

interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastPostDate: string | null;
  streakStartedAt: string | null;
  updatedAt: Date;
}

interface StreakMilestone {
  days: number;
  name: string;
  emoji: string;
}

const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, name: 'Week Warrior', emoji: '🔥' },
  { days: 14, name: 'Fortnight Fighter', emoji: '💪' },
  { days: 30, name: 'Monthly Master', emoji: '⭐' },
  { days: 50, name: 'Fifty Fire', emoji: '🌟' },
  { days: 100, name: 'Century Coder', emoji: '💯' },
  { days: 365, name: 'Year of Vibes', emoji: '👑' },
];

export class StreakService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get user's streak info
   */
  async getUserStreak(userId: string): Promise<UserStreak> {
    const result = await this.fastify.db.query(
      `SELECT user_id, current_streak, longest_streak, last_post_date, streak_started_at, updated_at
       FROM user_streaks
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default streak info
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastPostDate: null,
        streakStartedAt: null,
        updatedAt: new Date(),
      };
    }

    return this.mapStreakRow(result.rows[0]);
  }

  /**
   * Get streak info by username
   */
  async getStreakByUsername(username: string): Promise<UserStreak | null> {
    const result = await this.fastify.db.query(
      `SELECT s.user_id, s.current_streak, s.longest_streak, s.last_post_date, s.streak_started_at, s.updated_at
       FROM user_streaks s
       JOIN users u ON s.user_id = u.id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      // Check if user exists but has no streak record
      const userResult = await this.fastify.db.query(
        `SELECT id FROM users WHERE username = $1`,
        [username]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      return {
        userId: userResult.rows[0].id,
        currentStreak: 0,
        longestStreak: 0,
        lastPostDate: null,
        streakStartedAt: null,
        updatedAt: new Date(),
      };
    }

    return this.mapStreakRow(result.rows[0]);
  }

  /**
   * Update streak when user posts
   */
  async updateStreakOnPost(userId: string, postDate: Date): Promise<UserStreak> {
    const postDateStr = postDate.toISOString().split('T')[0];
    const currentStreak = await this.getUserStreak(userId);

    let newCurrentStreak = 1;
    let newLongestStreak = currentStreak.longestStreak;
    let streakStartedAt = postDateStr;

    if (currentStreak.lastPostDate) {
      const lastPost = new Date(currentStreak.lastPostDate);
      const daysDiff = this.daysBetween(lastPost, postDate);

      if (daysDiff === 0) {
        // Same day post, no change to streak
        return currentStreak;
      } else if (daysDiff === 1) {
        // Consecutive day - increment streak
        newCurrentStreak = currentStreak.currentStreak + 1;
        streakStartedAt = currentStreak.streakStartedAt || postDateStr;
      } else {
        // Streak broken - reset to 1
        newCurrentStreak = 1;
        streakStartedAt = postDateStr;
      }
    }

    // Update longest streak if needed
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    const result = await this.fastify.db.query(
      `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_post_date, streak_started_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         current_streak = $2,
         longest_streak = GREATEST(user_streaks.longest_streak, $3),
         last_post_date = $4,
         streak_started_at = CASE
           WHEN user_streaks.current_streak = 0 OR $2 = 1 THEN $5
           ELSE user_streaks.streak_started_at
         END,
         updated_at = NOW()
       RETURNING user_id, current_streak, longest_streak, last_post_date, streak_started_at, updated_at`,
      [userId, newCurrentStreak, newLongestStreak, postDateStr, streakStartedAt]
    );

    return this.mapStreakRow(result.rows[0]);
  }

  /**
   * Get milestone for a given streak
   */
  getStreakMilestone(streak: number): StreakMilestone | null {
    // Find the highest milestone achieved
    let highestMilestone: StreakMilestone | null = null;

    for (const milestone of STREAK_MILESTONES) {
      if (streak >= milestone.days) {
        highestMilestone = milestone;
      }
    }

    return highestMilestone;
  }

  /**
   * Get next milestone to achieve
   */
  getNextMilestone(streak: number): StreakMilestone | null {
    for (const milestone of STREAK_MILESTONES) {
      if (streak < milestone.days) {
        return milestone;
      }
    }
    return null;
  }

  /**
   * Get top streaks leaderboard
   */
  async getLeaderboard(limit = 10): Promise<Array<UserStreak & { username: string; displayName: string; avatarUrl: string | null }>> {
    const result = await this.fastify.db.query(
      `SELECT
        s.user_id, s.current_streak, s.longest_streak, s.last_post_date, s.streak_started_at, s.updated_at,
        u.username, u.display_name, u.avatar_url
       FROM user_streaks s
       JOIN users u ON s.user_id = u.id
       WHERE s.current_streak > 0
       ORDER BY s.current_streak DESC, s.updated_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      ...this.mapStreakRow(row),
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    }));
  }

  /**
   * Calculate days between two dates (ignoring time)
   */
  private daysBetween(date1: Date, date2: Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    d1.setUTCHours(0, 0, 0, 0);
    d2.setUTCHours(0, 0, 0, 0);

    const diffMs = d2.getTime() - d1.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Map database row to UserStreak object
   */
  private mapStreakRow(row: Record<string, unknown>): UserStreak {
    return {
      userId: row.user_id as string,
      currentStreak: row.current_streak as number,
      longestStreak: row.longest_streak as number,
      lastPostDate: row.last_post_date as string | null,
      streakStartedAt: row.streak_started_at as string | null,
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

import type { FastifyInstance } from 'fastify';

interface DailyVibecheck {
  id: string;
  vibecheckDate: string;
  triggerTime: Date;
  windowEndTime: Date;
  createdAt: Date;
}

interface VibecheckStatus {
  vibecheck: DailyVibecheck | null;
  status: 'waiting' | 'active' | 'late' | 'closed';
  timeRemainingSeconds: number | null;
  hasPostedToday: boolean;
  userPostIsLate: boolean | null;
}

interface LateStatus {
  isLate: boolean;
  lateByMinutes: number;
}

// VibeCheck window duration in minutes
const WINDOW_DURATION_MINUTES = 120;

// VibeCheck time range (9am - 9pm in hours, UTC)
const VIBECHECK_START_HOUR = 9;
const VIBECHECK_END_HOUR = 21;

export class VibecheckService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Generate a random time between 9am and 9pm UTC for today's vibecheck
   */
  private generateRandomTime(date: Date): Date {
    const hours = VIBECHECK_START_HOUR + Math.random() * (VIBECHECK_END_HOUR - VIBECHECK_START_HOUR);
    const minutes = Math.floor(Math.random() * 60);

    const triggerTime = new Date(date);
    triggerTime.setUTCHours(Math.floor(hours), minutes, 0, 0);

    return triggerTime;
  }

  /**
   * Generate today's vibecheck (called by cron job or manually)
   */
  async generateTodaysVibecheck(): Promise<DailyVibecheck> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check if already exists
    const existing = await this.getTodaysVibecheck();
    if (existing) {
      return existing;
    }

    const triggerTime = this.generateRandomTime(today);
    const windowEndTime = new Date(triggerTime.getTime() + WINDOW_DURATION_MINUTES * 60 * 1000);

    const result = await this.fastify.db.query(
      `INSERT INTO daily_vibechecks (vibecheck_date, trigger_time, window_end_time)
       VALUES ($1, $2, $3)
       ON CONFLICT (vibecheck_date) DO UPDATE SET
         trigger_time = EXCLUDED.trigger_time,
         window_end_time = EXCLUDED.window_end_time
       RETURNING id, vibecheck_date, trigger_time, window_end_time, created_at`,
      [todayStr, triggerTime.toISOString(), windowEndTime.toISOString()]
    );

    return this.mapVibecheckRow(result.rows[0]);
  }

  /**
   * Get today's vibecheck info
   */
  async getTodaysVibecheck(): Promise<DailyVibecheck | null> {
    const today = new Date().toISOString().split('T')[0];

    const result = await this.fastify.db.query(
      `SELECT id, vibecheck_date, trigger_time, window_end_time, created_at
       FROM daily_vibechecks
       WHERE vibecheck_date = $1`,
      [today]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapVibecheckRow(result.rows[0]);
  }

  /**
   * Get vibecheck by ID
   */
  async getById(id: string): Promise<DailyVibecheck | null> {
    const result = await this.fastify.db.query(
      `SELECT id, vibecheck_date, trigger_time, window_end_time, created_at
       FROM daily_vibechecks
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapVibecheckRow(result.rows[0]);
  }

  /**
   * Check current vibecheck status
   */
  getCurrentStatus(vibecheck: DailyVibecheck): 'waiting' | 'active' | 'late' | 'closed' {
    const now = new Date();
    const triggerTime = new Date(vibecheck.triggerTime);
    const windowEndTime = new Date(vibecheck.windowEndTime);

    // Before trigger time
    if (now < triggerTime) {
      return 'waiting';
    }

    // Within the 2-hour window
    if (now >= triggerTime && now <= windowEndTime) {
      return 'active';
    }

    // After window but same day - late posting allowed
    const endOfDay = new Date(triggerTime);
    endOfDay.setUTCHours(23, 59, 59, 999);

    if (now > windowEndTime && now <= endOfDay) {
      return 'late';
    }

    // Past the day
    return 'closed';
  }

  /**
   * Get time remaining in active window (in seconds)
   */
  getTimeRemaining(vibecheck: DailyVibecheck): number | null {
    const now = new Date();
    const windowEndTime = new Date(vibecheck.windowEndTime);

    if (now >= windowEndTime) {
      return null;
    }

    return Math.max(0, Math.floor((windowEndTime.getTime() - now.getTime()) / 1000));
  }

  /**
   * Calculate if a post is late and by how many minutes
   */
  calculateLateStatus(vibecheckTime: Date, postedAt: Date): LateStatus {
    const windowEnd = new Date(vibecheckTime.getTime() + WINDOW_DURATION_MINUTES * 60 * 1000);

    if (postedAt <= windowEnd) {
      return { isLate: false, lateByMinutes: 0 };
    }

    const lateByMs = postedAt.getTime() - windowEnd.getTime();
    const lateByMinutes = Math.ceil(lateByMs / (60 * 1000));

    return { isLate: true, lateByMinutes };
  }

  /**
   * Get full vibecheck status for a user
   */
  async getUserVibecheckStatus(userId: string): Promise<VibecheckStatus> {
    const vibecheck = await this.getTodaysVibecheck();

    if (!vibecheck) {
      return {
        vibecheck: null,
        status: 'waiting',
        timeRemainingSeconds: null,
        hasPostedToday: false,
        userPostIsLate: null,
      };
    }

    const status = this.getCurrentStatus(vibecheck);
    const timeRemainingSeconds = this.getTimeRemaining(vibecheck);

    // Check if user has posted today
    const today = new Date().toISOString().split('T')[0];
    const postResult = await this.fastify.db.query(
      `SELECT is_late FROM vibes WHERE user_id = $1 AND vibe_date = $2`,
      [userId, today]
    );

    const hasPostedToday = postResult.rows.length > 0;
    const userPostIsLate = hasPostedToday ? postResult.rows[0].is_late : null;

    return {
      vibecheck,
      status,
      timeRemainingSeconds,
      hasPostedToday,
      userPostIsLate,
    };
  }

  /**
   * Map database row to DailyVibecheck object
   */
  private mapVibecheckRow(row: Record<string, unknown>): DailyVibecheck {
    return {
      id: row.id as string,
      vibecheckDate: row.vibecheck_date as string,
      triggerTime: new Date(row.trigger_time as string),
      windowEndTime: new Date(row.window_end_time as string),
      createdAt: new Date(row.created_at as string),
    };
  }
}

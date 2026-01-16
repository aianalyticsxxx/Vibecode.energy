import type { FastifyInstance } from 'fastify';
import { getOpenAIClient, type ModerationAnalysis } from '../lib/openai.js';

// Thresholds from environment or defaults
const AUTO_REJECT_THRESHOLD = parseFloat(process.env.MODERATION_AUTO_REJECT_THRESHOLD || '0.9');
const MANUAL_REVIEW_THRESHOLD = parseFloat(process.env.MODERATION_REVIEW_THRESHOLD || '0.5');

export interface ModerationResult {
  id: string;
  shotId: string;
  isSafe: boolean;
  overallConfidence: number;
  nsfwScore: number;
  violenceScore: number;
  hateScore: number;
  harassmentScore: number;
  selfHarmScore: number;
  drugsScore: number;
  illegalScore: number;
  reasoning: string | null;
  modelVersion: string | null;
  processingTimeMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface ModerationQueueItem {
  id: string;
  shotId: string;
  moderationResultId: string | null;
  priority: number;
  status: 'pending' | 'in_review' | 'completed' | 'escalated';
  triggerCategory: string;
  triggerConfidence: number;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewDecision: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  // Joined data
  shot?: {
    id: string;
    imageUrl: string;
    prompt: string;
    caption: string | null;
    createdAt: Date;
  };
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  moderationResult?: ModerationResult;
}

export interface ModerationQueueStats {
  pending: number;
  inReview: number;
  todayProcessed: number;
  autoRejected24h: number;
  autoApproved24h: number;
}

export interface ModerationAction {
  action: 'approved' | 'rejected' | 'queued' | 'error';
  shotId: string;
  reason?: string;
  queueId?: string;
}

type ViolationCategory = 'nsfw' | 'violence' | 'hate' | 'harassment' | 'self_harm' | 'drugs' | 'illegal';

export class ModerationService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Analyze content and take appropriate action
   */
  async analyzeContent(shotId: string, imageUrl: string): Promise<ModerationAction> {
    // Check if moderation is enabled
    if (process.env.MODERATION_ENABLED !== 'true') {
      // Auto-approve if moderation disabled
      await this.updateShotStatus(shotId, 'approved');
      return { action: 'approved', shotId, reason: 'Moderation disabled' };
    }

    const client = getOpenAIClient();
    const analysis = await client.analyzeImage(imageUrl);

    // Handle API errors
    if ('error' in analysis) {
      await this.storeErrorResult(shotId, analysis.error);
      // On error, set to manual_review so it doesn't slip through
      await this.updateShotStatus(shotId, 'manual_review');
      return { action: 'error', shotId, reason: analysis.error };
    }

    // Store the analysis result
    const resultId = await this.storeResult(shotId, analysis);

    // Determine action based on thresholds
    return this.processAnalysisResult(shotId, analysis, resultId);
  }

  /**
   * Process analysis result and take action based on thresholds
   */
  private async processAnalysisResult(
    shotId: string,
    analysis: ModerationAnalysis,
    resultId: string
  ): Promise<ModerationAction> {
    const { overallConfidence, categories } = analysis;

    // Find the highest scoring category
    const categoryScores: [ViolationCategory, number][] = [
      ['nsfw', categories.nsfw],
      ['violence', categories.violence],
      ['hate', categories.hate],
      ['harassment', categories.harassment],
      ['self_harm', categories.selfHarm],
      ['drugs', categories.drugs],
      ['illegal', categories.illegal],
    ];

    const [triggerCategory, triggerConfidence] = categoryScores.reduce(
      (max, current) => (current[1] > max[1] ? current : max),
      ['nsfw', 0] as [ViolationCategory, number]
    );

    // High confidence violation - auto reject and ban
    if (overallConfidence >= AUTO_REJECT_THRESHOLD) {
      await this.autoRejectAndBan(shotId, triggerCategory, triggerConfidence, analysis.reasoning);
      return {
        action: 'rejected',
        shotId,
        reason: `Auto-rejected: ${triggerCategory} (${(triggerConfidence * 100).toFixed(0)}% confidence)`,
      };
    }

    // Medium confidence - queue for manual review
    if (overallConfidence >= MANUAL_REVIEW_THRESHOLD) {
      const queueId = await this.queueForReview(shotId, resultId, triggerCategory, triggerConfidence);
      await this.updateShotStatus(shotId, 'flagged');
      return {
        action: 'queued',
        shotId,
        queueId,
        reason: `Queued for review: ${triggerCategory} (${(triggerConfidence * 100).toFixed(0)}% confidence)`,
      };
    }

    // Low confidence - auto approve
    await this.updateShotStatus(shotId, 'approved');
    return { action: 'approved', shotId, reason: 'Content approved' };
  }

  /**
   * Auto-reject content and ban the user
   */
  private async autoRejectAndBan(
    shotId: string,
    category: string,
    confidence: number,
    reasoning: string | null
  ): Promise<void> {
    const hiddenReason = `Auto-rejected by AI moderation: ${category} (${(confidence * 100).toFixed(0)}% confidence). ${reasoning || ''}`;

    // Hide the shot
    await this.fastify.db.query(
      `UPDATE shots
       SET moderation_status = 'rejected',
           is_hidden = TRUE,
           hidden_at = NOW(),
           hidden_reason = $1
       WHERE id = $2`,
      [hiddenReason, shotId]
    );

    // Get the user ID from the shot
    const shotResult = await this.fastify.db.query(
      'SELECT user_id FROM shots WHERE id = $1',
      [shotId]
    );

    if (shotResult.rows.length > 0) {
      const userId = shotResult.rows[0].user_id;

      // Ban the user (set deleted_at)
      await this.fastify.db.query(
        'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );

      // Log the action
      await this.logModerationAction(
        null, // System action, no admin
        'auto_ban',
        'user',
        userId,
        { shotId, category, confidence, reasoning }
      );
    }

    // Also log the content rejection
    await this.logModerationAction(
      null,
      'auto_reject',
      'shot',
      shotId,
      { category, confidence, reasoning }
    );
  }

  /**
   * Queue content for manual review
   */
  async queueForReview(
    shotId: string,
    resultId: string,
    category: string,
    confidence: number
  ): Promise<string> {
    // Calculate priority based on confidence (higher confidence = higher priority)
    const priority = Math.round(confidence * 100);

    const result = await this.fastify.db.query(
      `INSERT INTO moderation_queue
       (shot_id, moderation_result_id, priority, status, trigger_category, trigger_confidence)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       ON CONFLICT (shot_id) WHERE status = 'pending'
       DO UPDATE SET
         priority = GREATEST(moderation_queue.priority, EXCLUDED.priority),
         trigger_confidence = GREATEST(moderation_queue.trigger_confidence, EXCLUDED.trigger_confidence)
       RETURNING id`,
      [shotId, resultId, priority, category, confidence]
    );

    return result.rows[0].id;
  }

  /**
   * Process a queue item (admin review decision)
   */
  async processQueueItem(
    queueId: string,
    decision: 'approve' | 'reject' | 'reject_and_ban' | 'escalate',
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    // Get the queue item
    const queueResult = await this.fastify.db.query(
      'SELECT shot_id FROM moderation_queue WHERE id = $1',
      [queueId]
    );

    if (queueResult.rows.length === 0) {
      throw new Error('Queue item not found');
    }

    const shotId = queueResult.rows[0].shot_id;

    // Update queue item
    await this.fastify.db.query(
      `UPDATE moderation_queue
       SET status = 'completed',
           reviewed_by = $1,
           reviewed_at = NOW(),
           review_decision = $2,
           review_notes = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [reviewerId, decision, notes || null, queueId]
    );

    // Take action based on decision
    switch (decision) {
      case 'approve':
        await this.fastify.db.query(
          `UPDATE shots
           SET moderation_status = 'approved', is_hidden = FALSE, hidden_at = NULL, hidden_reason = NULL
           WHERE id = $1`,
          [shotId]
        );
        break;

      case 'reject':
        await this.fastify.db.query(
          `UPDATE shots
           SET moderation_status = 'rejected', is_hidden = TRUE, hidden_at = NOW(), hidden_reason = $1
           WHERE id = $2`,
          [notes || 'Rejected by moderator', shotId]
        );
        break;

      case 'reject_and_ban': {
        // Reject the content
        await this.fastify.db.query(
          `UPDATE shots
           SET moderation_status = 'rejected', is_hidden = TRUE, hidden_at = NOW(), hidden_reason = $1
           WHERE id = $2`,
          [notes || 'Rejected by moderator', shotId]
        );

        // Get and ban the user
        const shotResult = await this.fastify.db.query(
          'SELECT user_id FROM shots WHERE id = $1',
          [shotId]
        );

        if (shotResult.rows.length > 0) {
          await this.fastify.db.query(
            'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            [shotResult.rows[0].user_id]
          );

          await this.logModerationAction(
            reviewerId,
            'manual_ban',
            'user',
            shotResult.rows[0].user_id,
            { shotId, notes }
          );
        }
        break;
      }

      case 'escalate':
        await this.fastify.db.query(
          `UPDATE moderation_queue SET status = 'escalated', updated_at = NOW() WHERE id = $1`,
          [queueId]
        );
        break;
    }

    // Log the review action
    await this.logModerationAction(reviewerId, `review_${decision}`, 'shot', shotId, { queueId, notes });
  }

  /**
   * Get queue items for admin review
   */
  async getQueueItems(
    status?: string,
    limit = 20,
    cursor?: string
  ): Promise<{ items: ModerationQueueItem[]; nextCursor: string | null; hasMore: boolean }> {
    const params: (string | number)[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (status) {
      conditions.push(`mq.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`mq.created_at < $${paramIndex}`);
      params.push(cursor);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit + 1);

    const result = await this.fastify.db.query(
      `SELECT
        mq.id, mq.shot_id, mq.moderation_result_id, mq.priority, mq.status,
        mq.trigger_category, mq.trigger_confidence, mq.reviewed_by, mq.reviewed_at,
        mq.review_decision, mq.review_notes, mq.created_at,
        s.image_url, s.prompt, s.caption, s.created_at as shot_created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url,
        mr.is_safe, mr.overall_confidence, mr.nsfw_score, mr.violence_score,
        mr.hate_score, mr.harassment_score, mr.self_harm_score, mr.drugs_score,
        mr.illegal_score, mr.reasoning, mr.model_version
       FROM moderation_queue mq
       JOIN shots s ON mq.shot_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN moderation_results mr ON mq.moderation_result_id = mr.id
       ${whereClause}
       ORDER BY mq.priority DESC, mq.created_at ASC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = result.rows.length > limit;
    const items = result.rows.slice(0, limit).map(this.mapQueueItem);
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.createdAt.toISOString() : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Get single queue item by ID
   */
  async getQueueItemById(queueId: string): Promise<ModerationQueueItem | null> {
    const result = await this.fastify.db.query(
      `SELECT
        mq.id, mq.shot_id, mq.moderation_result_id, mq.priority, mq.status,
        mq.trigger_category, mq.trigger_confidence, mq.reviewed_by, mq.reviewed_at,
        mq.review_decision, mq.review_notes, mq.created_at,
        s.image_url, s.prompt, s.caption, s.created_at as shot_created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url,
        mr.is_safe, mr.overall_confidence, mr.nsfw_score, mr.violence_score,
        mr.hate_score, mr.harassment_score, mr.self_harm_score, mr.drugs_score,
        mr.illegal_score, mr.reasoning, mr.model_version
       FROM moderation_queue mq
       JOIN shots s ON mq.shot_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN moderation_results mr ON mq.moderation_result_id = mr.id
       WHERE mq.id = $1`,
      [queueId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapQueueItem(result.rows[0]);
  }

  /**
   * Get moderation queue statistics
   */
  async getQueueStats(): Promise<ModerationQueueStats> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await this.fastify.db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_review') as in_review,
        COUNT(*) FILTER (WHERE status = 'completed' AND reviewed_at >= $1) as today_processed
       FROM moderation_queue`,
      [twentyFourHoursAgo.toISOString()]
    );

    // Get auto-action counts from shots
    const autoActionResult = await this.fastify.db.query(
      `SELECT
        COUNT(*) FILTER (WHERE moderation_status = 'rejected' AND hidden_at >= $1) as auto_rejected,
        COUNT(*) FILTER (WHERE moderation_status = 'approved' AND created_at >= $1) as auto_approved
       FROM shots`,
      [twentyFourHoursAgo.toISOString()]
    );

    return {
      pending: parseInt(result.rows[0].pending) || 0,
      inReview: parseInt(result.rows[0].in_review) || 0,
      todayProcessed: parseInt(result.rows[0].today_processed) || 0,
      autoRejected24h: parseInt(autoActionResult.rows[0].auto_rejected) || 0,
      autoApproved24h: parseInt(autoActionResult.rows[0].auto_approved) || 0,
    };
  }

  /**
   * Store moderation result in database
   */
  private async storeResult(shotId: string, analysis: ModerationAnalysis): Promise<string> {
    const result = await this.fastify.db.query(
      `INSERT INTO moderation_results
       (shot_id, is_safe, overall_confidence, nsfw_score, violence_score, hate_score,
        harassment_score, self_harm_score, drugs_score, illegal_score, reasoning,
        model_version, processing_time_ms, raw_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        shotId,
        analysis.isSafe,
        analysis.overallConfidence,
        analysis.categories.nsfw,
        analysis.categories.violence,
        analysis.categories.hate,
        analysis.categories.harassment,
        analysis.categories.selfHarm,
        analysis.categories.drugs,
        analysis.categories.illegal,
        analysis.reasoning,
        analysis.modelVersion,
        analysis.processingTimeMs,
        JSON.stringify(analysis),
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Store error result when analysis fails
   */
  private async storeErrorResult(shotId: string, errorMessage: string): Promise<void> {
    await this.fastify.db.query(
      `INSERT INTO moderation_results
       (shot_id, is_safe, overall_confidence, error_message)
       VALUES ($1, FALSE, 0.5, $2)`,
      [shotId, errorMessage]
    );
  }

  /**
   * Update shot moderation status
   */
  private async updateShotStatus(shotId: string, status: string): Promise<void> {
    await this.fastify.db.query(
      'UPDATE shots SET moderation_status = $1 WHERE id = $2',
      [status, shotId]
    );
  }

  /**
   * Log moderation action to audit log
   */
  private async logModerationAction(
    adminId: string | null,
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.fastify.db.query(
      `INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, targetType, targetId, JSON.stringify(details)]
    );
  }

  /**
   * Map database row to ModerationQueueItem
   */
  private mapQueueItem(row: Record<string, unknown>): ModerationQueueItem {
    return {
      id: row.id as string,
      shotId: row.shot_id as string,
      moderationResultId: row.moderation_result_id as string | null,
      priority: row.priority as number,
      status: row.status as ModerationQueueItem['status'],
      triggerCategory: row.trigger_category as string,
      triggerConfidence: parseFloat(row.trigger_confidence as string),
      reviewedBy: row.reviewed_by as string | null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : null,
      reviewDecision: row.review_decision as string | null,
      reviewNotes: row.review_notes as string | null,
      createdAt: new Date(row.created_at as string),
      shot: {
        id: row.shot_id as string,
        imageUrl: row.image_url as string,
        prompt: row.prompt as string,
        caption: row.caption as string | null,
        createdAt: new Date(row.shot_created_at as string),
      },
      user: {
        id: row.user_id as string,
        username: row.username as string,
        displayName: row.display_name as string,
        avatarUrl: row.avatar_url as string | null,
      },
      moderationResult: row.moderation_result_id
        ? {
            id: row.moderation_result_id as string,
            shotId: row.shot_id as string,
            isSafe: row.is_safe as boolean,
            overallConfidence: parseFloat(row.overall_confidence as string),
            nsfwScore: parseFloat(row.nsfw_score as string) || 0,
            violenceScore: parseFloat(row.violence_score as string) || 0,
            hateScore: parseFloat(row.hate_score as string) || 0,
            harassmentScore: parseFloat(row.harassment_score as string) || 0,
            selfHarmScore: parseFloat(row.self_harm_score as string) || 0,
            drugsScore: parseFloat(row.drugs_score as string) || 0,
            illegalScore: parseFloat(row.illegal_score as string) || 0,
            reasoning: row.reasoning as string | null,
            modelVersion: row.model_version as string | null,
            processingTimeMs: null,
            errorMessage: null,
            createdAt: new Date(),
          }
        : undefined,
    };
  }
}

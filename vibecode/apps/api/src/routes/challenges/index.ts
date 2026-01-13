import type { FastifyPluginAsync } from 'fastify';
import { ChallengeService } from '../../services/challenge.service.js';
import { ShotService } from '../../services/shot.service.js';

interface CreateChallengeBody {
  title: string;
  description?: string;
  isOfficial?: boolean;
  isSponsored?: boolean;
  sponsorName?: string;
  prizeDescription?: string;
  startsAt: string;
  endsAt: string;
  votingEndsAt?: string;
}

interface VoteBody {
  creativityScore: number;
  usefulnessScore: number;
  qualityScore: number;
}

interface ChallengeParams {
  id: string;
}

interface ShotParams {
  shotId: string;
}

interface GetChallengesQuery {
  cursor?: string;
  limit?: number;
  filter?: 'active' | 'upcoming' | 'completed' | 'all';
}

interface GetShotsQuery {
  cursor?: string;
  limit?: number;
}

export const challengeRoutes: FastifyPluginAsync = async (fastify) => {
  const challengeService = new ChallengeService(fastify);
  const shotService = new ShotService(fastify);

  // GET /challenges - List challenges
  fastify.get<{ Querystring: GetChallengesQuery }>('/', {
    preHandler: [fastify.optionalAuth],
  }, async (request, _reply) => {
    const { cursor, limit = 20, filter = 'active' } = request.query;

    if (filter === 'active') {
      const challenges = await challengeService.getActive();
      return { challenges };
    }

    if (filter === 'upcoming') {
      const challenges = await challengeService.getUpcoming();
      return { challenges };
    }

    if (filter === 'completed') {
      const challenges = await challengeService.getCompleted(limit);
      return { challenges };
    }

    // 'all' - paginated
    const result = await challengeService.getAll(cursor, Math.min(limit, 50));
    return result;
  });

  // GET /challenges/:id - Get single challenge
  fastify.get<{ Params: ChallengeParams }>('/:id', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id } = request.params;

    const challenge = await challengeService.getById(id);

    if (!challenge) {
      return reply.status(404).send({ error: 'Challenge not found' });
    }

    return challenge;
  });

  // GET /challenges/:id/shots - Get submissions for a challenge
  fastify.get<{ Params: ChallengeParams; Querystring: GetShotsQuery }>('/:id/shots', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id } = request.params;
    const { cursor, limit = 20 } = request.query;
    const userId = request.user?.userId;

    // Verify challenge exists
    const challenge = await challengeService.getById(id);
    if (!challenge) {
      return reply.status(404).send({ error: 'Challenge not found' });
    }

    const shots = await shotService.getChallengeShots(id, {
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
    });

    return shots;
  });

  // GET /challenges/:id/leaderboard - Get challenge leaderboard
  fastify.get<{ Params: ChallengeParams }>('/:id/leaderboard', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id } = request.params;

    // Verify challenge exists
    const challenge = await challengeService.getById(id);
    if (!challenge) {
      return reply.status(404).send({ error: 'Challenge not found' });
    }

    const leaderboard = await challengeService.getLeaderboard(id);

    return { leaderboard, challenge };
  });

  // POST /challenges - Create a new challenge (admin only for now)
  fastify.post<{ Body: CreateChallengeBody }>('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.user;
    const body = request.body;

    if (!body.title) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    if (!body.startsAt || !body.endsAt) {
      return reply.status(400).send({ error: 'Start and end dates are required' });
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    const votingEndsAt = body.votingEndsAt ? new Date(body.votingEndsAt) : undefined;

    if (endsAt <= startsAt) {
      return reply.status(400).send({ error: 'End date must be after start date' });
    }

    if (votingEndsAt && votingEndsAt <= endsAt) {
      return reply.status(400).send({ error: 'Voting end date must be after challenge end date' });
    }

    try {
      const challenge = await challengeService.create({
        title: body.title.trim(),
        description: body.description?.trim(),
        createdBy: userId,
        isOfficial: body.isOfficial || false,
        isSponsored: body.isSponsored || false,
        sponsorName: body.sponsorName?.trim(),
        prizeDescription: body.prizeDescription?.trim(),
        startsAt,
        endsAt,
        votingEndsAt,
      });

      return reply.status(201).send(challenge);
    } catch (err) {
      fastify.log.error({ err }, 'Error creating challenge');
      return reply.status(500).send({ error: 'Failed to create challenge' });
    }
  });

  // POST /challenges/:id/vote/:shotId - Vote on a shot in a challenge
  fastify.post<{ Params: ChallengeParams & ShotParams; Body: VoteBody }>('/:id/vote/:shotId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, shotId } = request.params;
    const { userId } = request.user;
    const { creativityScore, usefulnessScore, qualityScore } = request.body;

    // Validate scores
    if (!creativityScore || !usefulnessScore || !qualityScore) {
      return reply.status(400).send({ error: 'All scores (creativity, usefulness, quality) are required' });
    }

    // Verify challenge exists and is in voting period
    const challenge = await challengeService.getById(id);
    if (!challenge) {
      return reply.status(404).send({ error: 'Challenge not found' });
    }

    if (challenge.status === 'upcoming') {
      return reply.status(400).send({ error: 'Challenge has not started yet' });
    }

    // Note: We allow voting during 'active' and 'voting' phases

    try {
      const vote = await challengeService.vote({
        shotId,
        userId,
        creativityScore,
        usefulnessScore,
        qualityScore,
      });

      return { vote };
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('Cannot vote on your own')) {
        return reply.status(400).send({ error: error.message });
      }
      if (error.message.includes('not found') || error.message.includes('not part of')) {
        return reply.status(404).send({ error: error.message });
      }
      fastify.log.error({ err }, 'Error voting');
      return reply.status(500).send({ error: 'Failed to submit vote' });
    }
  });

  // GET /challenges/:id/vote/:shotId - Get user's vote for a shot
  fastify.get<{ Params: ChallengeParams & ShotParams }>('/:id/vote/:shotId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { shotId } = request.params;
    const { userId } = request.user;

    const vote = await challengeService.getUserVote(shotId, userId);

    if (!vote) {
      return reply.status(404).send({ error: 'Vote not found' });
    }

    return { vote };
  });
};

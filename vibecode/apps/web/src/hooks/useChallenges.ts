'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api, Challenge, Shot, ShotsFeedResponse, LeaderboardEntry } from '@/lib/api';
import { useCallback } from 'react';

export interface UseChallengesReturn {
  challenges: Challenge[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChallenges(filter: 'active' | 'upcoming' | 'completed' | 'all' = 'active'): UseChallengesReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['challenges', filter],
    queryFn: async () => {
      const response = await api.getChallenges(filter);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    challenges: data?.challenges || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export interface UseChallengeReturn {
  challenge: Challenge | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChallenge(challengeId: string | undefined): UseChallengeReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const response = await api.getChallenge(challengeId);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: !!challengeId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    challenge: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export interface UseChallengeShotsReturn {
  shots: Shot[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

export function useChallengeShots(challengeId: string | undefined): UseChallengeShotsReturn {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['challenge', challengeId, 'shots'],
    queryFn: async ({ pageParam }) => {
      if (!challengeId) return null;
      const response = await api.getChallengeShots(challengeId, pageParam);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data as ShotsFeedResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage?.hasMore && lastPage?.nextCursor) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
    enabled: !!challengeId,
    staleTime: 1000 * 60 * 5,
  });

  const shots = data?.pages.flatMap((page) => page?.shots || []) || [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    shots,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
  };
}

export interface UseChallengeLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  challenge: Challenge | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChallengeLeaderboard(challengeId: string | undefined): UseChallengeLeaderboardReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['challenge', challengeId, 'leaderboard'],
    queryFn: async () => {
      if (!challengeId) return null;
      const response = await api.getChallengeLeaderboard(challengeId);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: !!challengeId,
    staleTime: 1000 * 60 * 2, // 2 minutes - leaderboard updates more frequently
  });

  return {
    leaderboard: data?.leaderboard || [],
    challenge: data?.challenge || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

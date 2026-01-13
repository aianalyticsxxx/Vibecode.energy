'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { api, Shot, ShotsFeedResponse } from '@/lib/api';
import { useCallback } from 'react';

export interface UseFollowingFeedReturn {
  shots: Shot[];
  vibes: Shot[]; // Legacy alias
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefetching: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

export function useFollowingFeed(): UseFollowingFeedReturn {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['shots', 'following'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.getFollowingFeed(pageParam);

      if (error) {
        throw new Error(error.message);
      }

      return data as ShotsFeedResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage?.hasMore && lastPage?.nextCursor) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
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
    vibes: shots, // Legacy alias
    isLoading,
    isLoadingMore: isFetchingNextPage,
    isRefetching,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
  };
}

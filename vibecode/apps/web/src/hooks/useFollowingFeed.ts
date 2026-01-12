'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { api, Vibe, VibesFeedResponse } from '@/lib/api';
import { useCallback } from 'react';

export interface UseFollowingFeedReturn {
  vibes: Vibe[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefetching: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

export function useFollowingFeed(): UseFollowingFeedReturn {
  const queryClient = useQueryClient();

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
    queryKey: ['vibes', 'following'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.getFollowingFeed(pageParam);

      if (error) {
        throw new Error(error.message);
      }

      return data as VibesFeedResponse;
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

  const vibes = data?.pages.flatMap((page) => page?.vibes || []) || [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    vibes,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    isRefetching,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
  };
}

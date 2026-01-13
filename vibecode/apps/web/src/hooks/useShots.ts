'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { api, Shot, ShotsFeedResponse } from '@/lib/api';
import { useCallback } from 'react';

export interface UseShotsReturn {
  shots: Shot[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefetching: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
  addShot: (shot: Shot) => void;
}

export function useShots(sort: 'recent' | 'popular' = 'recent'): UseShotsReturn {
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
    queryKey: ['shots', sort],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.getFeed(pageParam, sort);

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const shots = data?.pages.flatMap((page) => page?.shots || []) || [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Optimistically add a new shot to the feed
  const addShot = useCallback(
    (shot: Shot) => {
      queryClient.setQueryData<typeof data>(['shots', sort], (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                shots: [shot, ...(page?.shots || [])],
              };
            }
            return page;
          }),
        };
      });
    },
    [queryClient, sort]
  );

  return {
    shots,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    isRefetching,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
    addShot,
  };
}

// Keep legacy alias
export function useVibes() {
  const result = useShots();
  return {
    vibes: result.shots,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    isRefetching: result.isRefetching,
    hasMore: result.hasMore,
    error: result.error,
    loadMore: result.loadMore,
    refetch: result.refetch,
    addVibe: result.addShot,
  };
}

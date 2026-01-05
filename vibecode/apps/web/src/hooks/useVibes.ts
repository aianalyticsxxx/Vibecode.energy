'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { api, Vibe, VibesFeedResponse } from '@/lib/api';
import { useCallback } from 'react';

export interface UseVibesReturn {
  vibes: Vibe[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
  addVibe: (vibe: Vibe) => void;
}

export function useVibes(): UseVibesReturn {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['vibes'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.getFeed(pageParam);

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const vibes = data?.pages.flatMap((page) => page?.vibes || []) || [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Optimistically add a new vibe to the feed
  const addVibe = useCallback(
    (vibe: Vibe) => {
      queryClient.setQueryData<typeof data>(['vibes'], (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                vibes: [vibe, ...(page?.vibes || [])],
              };
            }
            return page;
          }),
        };
      });
    },
    [queryClient]
  );

  return {
    vibes,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
    addVibe,
  };
}

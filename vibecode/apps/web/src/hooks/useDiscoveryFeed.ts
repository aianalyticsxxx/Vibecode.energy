'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { api, Vibe } from '@/lib/api';

type SortOption = 'recent' | 'popular';

interface UseDiscoveryFeedReturn {
  vibes: Vibe[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  refetch: () => void;
}

export function useDiscoveryFeed(sort: SortOption = 'recent'): UseDiscoveryFeedReturn {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['discovery', sort],
    queryFn: async ({ pageParam }) => {
      const response = await api.getDiscoveryFeed(pageParam, sort);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
  });

  const vibes = data?.pages.flatMap((page) => page?.vibes ?? []) ?? [];

  return {
    vibes,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    error: error as Error | null,
    fetchNextPage,
    refetch,
  };
}

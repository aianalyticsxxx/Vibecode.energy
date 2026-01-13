'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { api, Shot } from '@/lib/api';

type SortOption = 'recent' | 'popular';

interface UseDiscoveryFeedReturn {
  shots: Shot[];
  vibes: Shot[]; // Legacy alias
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
    queryKey: ['shots', 'discovery', sort],
    queryFn: async ({ pageParam }) => {
      const response = await api.getFeed(pageParam, sort);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
  });

  const shots = data?.pages.flatMap((page) => page?.shots ?? []) ?? [];

  return {
    shots,
    vibes: shots, // Legacy alias
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    error: error as Error | null,
    fetchNextPage,
    refetch,
  };
}

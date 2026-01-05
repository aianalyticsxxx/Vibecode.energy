'use client';

import { useQuery } from '@tanstack/react-query';
import { api, UserStreak } from '@/lib/api';

interface UseStreakReturn {
  streak: UserStreak | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStreak(username: string | undefined): UseStreakReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['streak', username],
    queryFn: async () => {
      if (!username) return null;
      const response = await api.getUserStreak(username);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: !!username,
    staleTime: 60000, // Consider data stale after 1 minute
  });

  return {
    streak: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

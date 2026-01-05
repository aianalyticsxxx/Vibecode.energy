'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Vibe } from '@/lib/api';
import { useCallback } from 'react';
import { useAuth } from './useAuth';

export interface UseDailyVibeReturn {
  hasPostedToday: boolean;
  todaysVibe: Vibe | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  markAsPosted: (vibe: Vibe) => void;
}

export function useDailyVibe(): UseDailyVibeReturn {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['daily-vibe-status'],
    queryFn: async () => {
      const { data, error } = await api.getDailyVibeStatus();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Optimistically mark as posted
  const markAsPosted = useCallback(
    (vibe: Vibe) => {
      queryClient.setQueryData(['daily-vibe-status'], {
        hasPostedToday: true,
        vibe: vibe,
      });
    },
    [queryClient]
  );

  return {
    hasPostedToday: data?.hasPostedToday || false,
    todaysVibe: data?.vibe || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    markAsPosted,
  };
}

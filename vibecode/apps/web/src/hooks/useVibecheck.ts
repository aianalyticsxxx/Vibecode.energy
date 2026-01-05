'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { api, VibecheckStatus } from '@/lib/api';

interface UseVibecheckReturn {
  vibecheck: VibecheckStatus['vibecheck'];
  status: VibecheckStatus['status'];
  timeRemaining: number | null;
  hasPostedToday: boolean;
  userPostIsLate: boolean | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  formattedTimeRemaining: string;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function useVibecheck(): UseVibecheckReturn {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vibecheck'],
    queryFn: async () => {
      const response = await api.getVibecheckStatus();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute to stay updated
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Initialize time remaining from query data
  useEffect(() => {
    if (data?.timeRemainingSeconds !== undefined) {
      setTimeRemaining(data.timeRemainingSeconds);
    }
  }, [data?.timeRemainingSeconds]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    vibecheck: data?.vibecheck ?? null,
    status: data?.status ?? 'waiting',
    timeRemaining,
    hasPostedToday: data?.hasPostedToday ?? false,
    userPostIsLate: data?.userPostIsLate ?? null,
    isLoading,
    error: error as Error | null,
    refetch: handleRefetch,
    formattedTimeRemaining: timeRemaining !== null ? formatTimeRemaining(timeRemaining) : '',
  };
}

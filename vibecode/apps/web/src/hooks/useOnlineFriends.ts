'use client';

import { useQuery } from '@tanstack/react-query';
import { api, OnlineUser } from '@/lib/api';
import { useEffect } from 'react';

export function useOnlineFriends() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['online-friends'],
    queryFn: async () => {
      const { data, error } = await api.getOnlineFriends();
      if (error) throw new Error(error.message);
      return data?.users ?? [];
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refresh every 60 seconds
  });

  // Update our own presence periodically
  useEffect(() => {
    const updatePresence = async () => {
      await api.updatePresence();
    };

    // Update immediately
    updatePresence();

    // Then every 2 minutes
    const interval = setInterval(updatePresence, 1000 * 60 * 2);

    return () => clearInterval(interval);
  }, []);

  return {
    onlineFriends: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

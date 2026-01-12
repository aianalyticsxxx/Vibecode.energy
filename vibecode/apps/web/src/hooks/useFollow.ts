'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useFollow(userId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: async () => {
      const { data, error } = await api.getFollowStatus(userId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.followUser(userId);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['vibes', 'following'] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.unfollowUser(userId);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['vibes', 'following'] });
    },
  });

  const toggleFollow = () => {
    if (data?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return {
    isFollowing: data?.isFollowing ?? false,
    followerCount: data?.followerCount ?? 0,
    followingCount: data?.followingCount ?? 0,
    isLoading,
    isToggling: followMutation.isPending || unfollowMutation.isPending,
    toggleFollow,
    follow: () => followMutation.mutate(),
    unfollow: () => unfollowMutation.mutate(),
  };
}

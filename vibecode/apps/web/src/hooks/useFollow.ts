'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export function useFollow(userId: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: async () => {
      const { data, error } = await api.getFollowStatus(userId);
      if (error) throw new Error(error.message);
      return data;
    },
    // Only fetch when we have a userId AND user is authenticated
    enabled: !!userId && isAuthenticated,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.followUser(userId);
      if (error) throw new Error(error.message);
      return data;
    },
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['follow-status', userId] });
      const previous = queryClient.getQueryData<FollowStatus>(['follow-status', userId]);
      queryClient.setQueryData<FollowStatus>(['follow-status', userId], (old) => ({
        isFollowing: true,
        followerCount: (old?.followerCount ?? 0) + 1,
        followingCount: old?.followingCount ?? 0,
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Revert on error
      if (context?.previous) {
        queryClient.setQueryData(['follow-status', userId], context.previous);
      }
    },
    onSettled: () => {
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
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['follow-status', userId] });
      const previous = queryClient.getQueryData<FollowStatus>(['follow-status', userId]);
      queryClient.setQueryData<FollowStatus>(['follow-status', userId], (old) => ({
        isFollowing: false,
        followerCount: Math.max((old?.followerCount ?? 1) - 1, 0),
        followingCount: old?.followingCount ?? 0,
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Revert on error
      if (context?.previous) {
        queryClient.setQueryData(['follow-status', userId], context.previous);
      }
    },
    onSettled: () => {
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

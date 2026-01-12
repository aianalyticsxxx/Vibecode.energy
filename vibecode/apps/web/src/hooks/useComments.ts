'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Comment, CommentsResponse } from '@/lib/api';
import { useCallback } from 'react';

export function useComments(vibeId: string) {
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
    queryKey: ['comments', vibeId],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.getComments(vibeId, pageParam);
      if (error) throw new Error(error.message);
      return data as CommentsResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage?.hasMore && lastPage?.nextCursor) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
    enabled: !!vibeId,
  });

  const comments = data?.pages.flatMap((page) => page?.comments || []) || [];
  const total = data?.pages[0]?.total ?? 0;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await api.addComment(vibeId, content);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', vibeId] });
      // Invalidate feed queries to update comment count
      queryClient.invalidateQueries({ queryKey: ['vibes'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await api.deleteComment(vibeId, commentId);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', vibeId] });
      queryClient.invalidateQueries({ queryKey: ['vibes'] });
    },
  });

  return {
    comments,
    total,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
    addComment: addCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    isDeletingComment: deleteCommentMutation.isPending,
  };
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { adminApi, type AdminShot, type AdminComment, type AdminTag } from '@/lib/api';
import { formatRelativeTime, truncate } from '@/lib/utils';

type ContentTab = 'shots' | 'comments' | 'tags';

export default function ContentPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentTab>('shots');
  const [search, setSearch] = useState('');

  // Shots Query
  const { data: shotsData, isLoading: shotsLoading } = useQuery({
    queryKey: ['admin', 'shots'],
    queryFn: async () => {
      const response = await adminApi.getShots({ limit: 50 });
      return response.data;
    },
    enabled: activeTab === 'shots',
  });

  // Comments Query
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: async () => {
      const response = await adminApi.getComments({ limit: 50 });
      return response.data;
    },
    enabled: activeTab === 'comments',
  });

  // Tags Query
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ['admin', 'tags', search],
    queryFn: async () => {
      const response = await adminApi.getTags({ search: search || undefined, limit: 50 });
      return response.data;
    },
    enabled: activeTab === 'tags',
  });

  // Mutations
  const deleteShotMutation = useMutation({
    mutationFn: async (id: string) => adminApi.deleteShot(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'shots'] }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => adminApi.deleteComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] }),
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => adminApi.deleteTag(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] }),
  });

  const banTagMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      adminApi.banTag(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] }),
  });

  // Columns
  const shotColumns = [
    {
      key: 'image',
      header: 'Shot',
      render: (shot: AdminShot) => (
        <img src={shot.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
      ),
    },
    {
      key: 'prompt',
      header: 'Prompt',
      render: (shot: AdminShot) => (
        <span className="text-admin-text max-w-xs truncate block">{truncate(shot.prompt, 50)}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (shot: AdminShot) => (
        <span className="text-admin-text-secondary">@{shot.username}</span>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (shot: AdminShot) => (
        <div className="text-sm">
          <span>{shot.sparkleCount} sparkles</span>
          <span className="text-admin-text-secondary ml-2">{shot.commentCount} comments</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (shot: AdminShot) => <Badge variant="default">{shot.resultType}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (shot: AdminShot) => (
        <span className="text-admin-text-secondary">{formatRelativeTime(shot.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (shot: AdminShot) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => deleteShotMutation.mutate(shot.id)}
          isLoading={deleteShotMutation.isPending}
        >
          Delete
        </Button>
      ),
    },
  ];

  const commentColumns = [
    {
      key: 'content',
      header: 'Comment',
      render: (comment: AdminComment) => (
        <span className="text-admin-text max-w-md truncate block">
          {truncate(comment.content, 100)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (comment: AdminComment) => (
        <span className="text-admin-text-secondary">@{comment.username}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (comment: AdminComment) => (
        <span className="text-admin-text-secondary">{formatRelativeTime(comment.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (comment: AdminComment) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => deleteCommentMutation.mutate(comment.id)}
          isLoading={deleteCommentMutation.isPending}
        >
          Delete
        </Button>
      ),
    },
  ];

  const tagColumns = [
    {
      key: 'name',
      header: 'Tag',
      render: (tag: AdminTag) => (
        <span className="text-admin-accent font-medium">#{tag.name}</span>
      ),
    },
    {
      key: 'shotCount',
      header: 'Shots',
      render: (tag: AdminTag) => <span className="text-admin-text">{tag.shotCount}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (tag: AdminTag) => (
        <span className="text-admin-text-secondary">{formatRelativeTime(tag.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (tag: AdminTag) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const reason = prompt('Enter reason for banning this tag:');
              if (reason) {
                banTagMutation.mutate({ id: tag.id, reason });
              }
            }}
            isLoading={banTagMutation.isPending}
          >
            Ban
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (confirm('Delete this tag? This will remove it from all shots.')) {
                deleteTagMutation.mutate(tag.id);
              }
            }}
            isLoading={deleteTagMutation.isPending}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-admin-text">Content</h1>
          <p className="text-admin-text-secondary mt-1">
            Manage shots, comments, and tags across the platform
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-admin-border">
          <div className="flex gap-8">
            {(['shots', 'comments', 'tags'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-admin-accent text-admin-text'
                    : 'border-transparent text-admin-text-secondary hover:text-admin-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search (for tags) */}
        {activeTab === 'tags' && (
          <div className="max-w-md">
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Content */}
        {activeTab === 'shots' && (
          <DataTable
            columns={shotColumns}
            data={shotsData?.shots ?? []}
            keyExtractor={(shot) => shot.id}
            isLoading={shotsLoading}
            emptyMessage="No shots found"
          />
        )}

        {activeTab === 'comments' && (
          <DataTable
            columns={commentColumns}
            data={commentsData?.comments ?? []}
            keyExtractor={(comment) => comment.id}
            isLoading={commentsLoading}
            emptyMessage="No comments found"
          />
        )}

        {activeTab === 'tags' && (
          <DataTable
            columns={tagColumns}
            data={tagsData?.tags ?? []}
            keyExtractor={(tag) => tag.id}
            isLoading={tagsLoading}
            emptyMessage="No tags found"
          />
        )}
      </div>
    </AdminLayout>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/ui/DataTable';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { Select } from '@/components/admin/ui/Select';
import { Modal } from '@/components/admin/ui/Modal';
import { Input } from '@/components/admin/ui/Input';
import { adminApi, type AdminChallenge } from '@/lib/admin/api';
import { formatDate, formatRelativeTime } from '@/lib/admin/utils';

export default function ChallengesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallenge | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    votingEndsAt: '',
    isOfficial: false,
    isSponsored: false,
    sponsorName: '',
    prizeDescription: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'challenges', statusFilter],
    queryFn: async () => {
      const params: { status?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await adminApi.getChallenges(params);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return adminApi.createChallenge({
        title: data.title,
        description: data.description || undefined,
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: new Date(data.endsAt).toISOString(),
        votingEndsAt: data.votingEndsAt ? new Date(data.votingEndsAt).toISOString() : undefined,
        isOfficial: data.isOfficial,
        isSponsored: data.isSponsored,
        sponsorName: data.sponsorName || undefined,
        prizeDescription: data.prizeDescription || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.startsAt) updateData.startsAt = new Date(data.startsAt).toISOString();
      if (data.endsAt) updateData.endsAt = new Date(data.endsAt).toISOString();
      if (data.votingEndsAt) updateData.votingEndsAt = new Date(data.votingEndsAt).toISOString();
      if (data.isOfficial !== undefined) updateData.isOfficial = data.isOfficial;
      if (data.isSponsored !== undefined) updateData.isSponsored = data.isSponsored;
      if (data.sponsorName !== undefined) updateData.sponsorName = data.sponsorName;
      if (data.prizeDescription !== undefined) updateData.prizeDescription = data.prizeDescription;
      return adminApi.updateChallenge(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      setEditingChallenge(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return adminApi.deleteChallenge(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      votingEndsAt: '',
      isOfficial: false,
      isSponsored: false,
      sponsorName: '',
      prizeDescription: '',
    });
  };

  const openEditModal = (challenge: AdminChallenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description || '',
      startsAt: new Date(challenge.startsAt).toISOString().slice(0, 16),
      endsAt: new Date(challenge.endsAt).toISOString().slice(0, 16),
      votingEndsAt: challenge.votingEndsAt
        ? new Date(challenge.votingEndsAt).toISOString().slice(0, 16)
        : '',
      isOfficial: challenge.isOfficial,
      isSponsored: challenge.isSponsored,
      sponsorName: challenge.sponsorName || '',
      prizeDescription: challenge.prizeDescription || '',
    });
  };

  const columns = [
    {
      key: 'title',
      header: 'Challenge',
      render: (challenge: AdminChallenge) => (
        <div>
          <p className="font-medium text-admin-text">{challenge.title}</p>
          <p className="text-sm text-admin-text-secondary truncate max-w-xs">
            {challenge.description || 'No description'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (challenge: AdminChallenge) => (
        <Badge
          variant={
            challenge.status === 'active'
              ? 'success'
              : challenge.status === 'voting'
                ? 'info'
                : challenge.status === 'upcoming'
                  ? 'warning'
                  : 'default'
          }
        >
          {challenge.status}
        </Badge>
      ),
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (challenge: AdminChallenge) => (
        <div className="flex items-center gap-1">
          {challenge.isOfficial && <Badge variant="info">Official</Badge>}
          {challenge.isSponsored && <Badge variant="warning">Sponsored</Badge>}
        </div>
      ),
    },
    {
      key: 'submissions',
      header: 'Submissions',
      render: (challenge: AdminChallenge) => (
        <span className="text-admin-text">{challenge.submissionCount}</span>
      ),
    },
    {
      key: 'dates',
      header: 'Period',
      render: (challenge: AdminChallenge) => (
        <div className="text-sm">
          <p>{formatDate(challenge.startsAt)}</p>
          <p className="text-admin-text-secondary">to {formatDate(challenge.endsAt)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (challenge: AdminChallenge) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(challenge);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this challenge?')) {
                deleteMutation.mutate(challenge.id);
              }
            }}
            isLoading={deleteMutation.isPending}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-admin-text">Challenges</h1>
            <p className="text-admin-text-secondary mt-1">
              Create and manage platform challenges
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>Create Challenge</Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'active', label: 'Active' },
              { value: 'voting', label: 'Voting' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data?.challenges ?? []}
          keyExtractor={(challenge) => challenge.id}
          isLoading={isLoading}
          emptyMessage="No challenges found"
        />

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isCreateModalOpen || !!editingChallenge}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingChallenge(null);
            resetForm();
          }}
          title={editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
          className="max-w-2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingChallenge) {
                updateMutation.mutate({ id: editingChallenge.id, data: formData });
              } else {
                createMutation.mutate(formData);
              }
            }}
            className="space-y-4"
          >
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-admin-bg-card border border-admin-border rounded-lg text-admin-text placeholder:text-admin-text-dim focus:outline-none focus:ring-2 focus:ring-admin-accent resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Starts At"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                required
              />
              <Input
                label="Ends At"
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                required
              />
            </div>

            <Input
              label="Voting Ends At (optional)"
              type="datetime-local"
              value={formData.votingEndsAt}
              onChange={(e) => setFormData({ ...formData, votingEndsAt: e.target.value })}
            />

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isOfficial}
                  onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                  className="w-4 h-4 rounded border-admin-border bg-admin-bg-card"
                />
                <span className="text-sm text-admin-text">Official Challenge</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isSponsored}
                  onChange={(e) => setFormData({ ...formData, isSponsored: e.target.checked })}
                  className="w-4 h-4 rounded border-admin-border bg-admin-bg-card"
                />
                <span className="text-sm text-admin-text">Sponsored</span>
              </label>
            </div>

            {formData.isSponsored && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Sponsor Name"
                  value={formData.sponsorName}
                  onChange={(e) => setFormData({ ...formData, sponsorName: e.target.value })}
                />
                <Input
                  label="Prize Description"
                  value={formData.prizeDescription}
                  onChange={(e) => setFormData({ ...formData, prizeDescription: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingChallenge(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editingChallenge ? 'Update' : 'Create'} Challenge
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}

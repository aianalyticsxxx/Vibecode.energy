'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/ui/DataTable';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { Select } from '@/components/admin/ui/Select';
import { Modal } from '@/components/admin/ui/Modal';
import { StatCard } from '@/components/admin/ui/StatCard';
import { adminApi, type ModerationQueueItem } from '@/lib/admin/api';
import { formatRelativeTime } from '@/lib/admin/utils';

function getCategoryVariant(category: string): 'error' | 'warning' | 'info' | 'default' {
  switch (category) {
    case 'nsfw':
    case 'violence':
    case 'hate':
      return 'error';
    case 'harassment':
    case 'self_harm':
      return 'warning';
    case 'drugs':
    case 'illegal':
      return 'info';
    default:
      return 'default';
  }
}

function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`;
}

function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const percentage = score * 100;
  const getColor = () => {
    if (percentage >= 70) return 'bg-red-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-admin-text-secondary w-20">{label}</span>
      <div className="flex-1 h-2 bg-admin-bg-card rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-admin-text-secondary w-10 text-right">
        {formatConfidence(score)}
      </span>
    </div>
  );
}

export default function AIModerationPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [imageBlurred, setImageBlurred] = useState(true);

  // Fetch queue items
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'moderation', 'queue', statusFilter],
    queryFn: async () => {
      const params: { status?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await adminApi.getModerationQueue(params);
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'moderation', 'stats'],
    queryFn: async () => {
      const response = await adminApi.getModerationStats();
      return response.data;
    },
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: 'approve' | 'reject' | 'reject_and_ban' | 'escalate';
      notes?: string;
    }) => {
      return adminApi.reviewModerationItem(id, { decision, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSelectedItem(null);
      setReviewNotes('');
      setImageBlurred(true);
    },
  });

  const handleReview = (decision: 'approve' | 'reject' | 'reject_and_ban' | 'escalate') => {
    if (!selectedItem) return;
    reviewMutation.mutate({
      id: selectedItem.id,
      decision,
      notes: reviewNotes || undefined,
    });
  };

  const columns = [
    {
      key: 'image',
      header: 'Preview',
      render: (item: ModerationQueueItem) => (
        <div className="w-12 h-12 rounded overflow-hidden bg-admin-bg-card">
          {item.shot?.imageUrl && (
            <img
              src={item.shot.imageUrl}
              alt="Preview"
              className="w-full h-full object-cover blur-md"
            />
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: ModerationQueueItem) => (
        <Badge variant={getCategoryVariant(item.triggerCategory)}>
          {item.triggerCategory.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (item: ModerationQueueItem) => (
        <span className={`font-mono ${item.triggerConfidence >= 0.7 ? 'text-red-400' : item.triggerConfidence >= 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
          {formatConfidence(item.triggerConfidence)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (item: ModerationQueueItem) => (
        <span className="text-admin-text-secondary">
          @{item.user?.username || 'unknown'}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: ModerationQueueItem) => (
        <span className={`font-mono ${item.priority >= 70 ? 'text-red-400' : 'text-admin-text-secondary'}`}>
          {item.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ModerationQueueItem) => (
        <Badge
          variant={
            item.status === 'pending'
              ? 'warning'
              : item.status === 'completed'
                ? 'success'
                : item.status === 'escalated'
                  ? 'error'
                  : 'default'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Flagged',
      render: (item: ModerationQueueItem) => (
        <span className="text-admin-text-secondary">
          {formatRelativeTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: ModerationQueueItem) =>
        item.status === 'pending' ? (
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem(item);
              setImageBlurred(true);
            }}
          >
            Review
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-admin-text">AI Content Moderation</h1>
          <p className="text-admin-text-secondary mt-1">
            Review AI-flagged content and take moderation actions
          </p>
        </div>

        {/* Stats */}
        {statsData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              title="Pending Review"
              value={statsData.pending}
              change={statsData.pending > 10 ? 'Needs attention' : undefined}
              changeType={statsData.pending > 10 ? 'negative' : 'neutral'}
            />
            <StatCard
              title="In Review"
              value={statsData.inReview}
            />
            <StatCard
              title="Processed Today"
              value={statsData.todayProcessed}
            />
            <StatCard
              title="Auto-Rejected (24h)"
              value={statsData.autoRejected24h}
            />
            <StatCard
              title="Auto-Approved (24h)"
              value={statsData.autoApproved24h}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'escalated', label: 'Escalated' },
            ]}
          />
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => {
            setSelectedItem(item);
            setImageBlurred(true);
          }}
          isLoading={isLoading}
          emptyMessage="No flagged content to review"
        />

        {/* Review Modal */}
        <Modal
          isOpen={!!selectedItem}
          onClose={() => {
            setSelectedItem(null);
            setReviewNotes('');
            setImageBlurred(true);
          }}
          title="Content Review"
          className="max-w-4xl"
        >
          {selectedItem && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Image Preview */}
                <div>
                  <label className="text-sm text-admin-text-secondary mb-2 block">
                    Image Preview
                  </label>
                  <div
                    className="relative aspect-square bg-admin-bg-card rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => setImageBlurred(!imageBlurred)}
                  >
                    {selectedItem.shot?.imageUrl && (
                      <>
                        <img
                          src={selectedItem.shot.imageUrl}
                          alt="Content"
                          className={`w-full h-full object-contain transition-all duration-300 ${imageBlurred ? 'blur-xl' : ''}`}
                        />
                        {imageBlurred && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <p className="text-white text-sm">Click to reveal</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-admin-text-secondary mt-2">
                    Click image to toggle blur
                  </p>
                </div>

                {/* Content Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-admin-text-secondary">User</label>
                    <p className="text-admin-text">
                      @{selectedItem.user?.username || 'unknown'}
                      {selectedItem.user?.displayName && (
                        <span className="text-admin-text-secondary ml-2">
                          ({selectedItem.user.displayName})
                        </span>
                      )}
                    </p>
                  </div>

                  {selectedItem.shot?.prompt && (
                    <div>
                      <label className="text-sm text-admin-text-secondary">Prompt</label>
                      <p className="text-admin-text bg-admin-bg-card p-2 rounded">
                        {selectedItem.shot.prompt}
                      </p>
                    </div>
                  )}

                  {selectedItem.shot?.caption && (
                    <div>
                      <label className="text-sm text-admin-text-secondary">Caption</label>
                      <p className="text-admin-text bg-admin-bg-card p-2 rounded">
                        {selectedItem.shot.caption}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-admin-text-secondary">Trigger</label>
                    <p className="text-admin-text mt-1">
                      <Badge variant={getCategoryVariant(selectedItem.triggerCategory)}>
                        {selectedItem.triggerCategory.replace('_', ' ')}
                      </Badge>
                      <span className="ml-2 font-mono">
                        {formatConfidence(selectedItem.triggerConfidence)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Analysis Breakdown */}
              {selectedItem.moderationResult && (
                <div>
                  <label className="text-sm text-admin-text-secondary mb-3 block">
                    AI Analysis Breakdown
                  </label>
                  <div className="bg-admin-bg-card p-4 rounded-lg space-y-2">
                    <ConfidenceBar score={selectedItem.moderationResult.nsfwScore} label="NSFW" />
                    <ConfidenceBar score={selectedItem.moderationResult.violenceScore} label="Violence" />
                    <ConfidenceBar score={selectedItem.moderationResult.hateScore} label="Hate" />
                    <ConfidenceBar score={selectedItem.moderationResult.harassmentScore} label="Harassment" />
                    <ConfidenceBar score={selectedItem.moderationResult.selfHarmScore} label="Self Harm" />
                    <ConfidenceBar score={selectedItem.moderationResult.drugsScore} label="Drugs" />
                    <ConfidenceBar score={selectedItem.moderationResult.illegalScore} label="Illegal" />
                  </div>

                  {selectedItem.moderationResult.reasoning && (
                    <div className="mt-4">
                      <label className="text-sm text-admin-text-secondary">AI Reasoning</label>
                      <p className="text-admin-text bg-admin-bg-card p-3 rounded-lg mt-1 text-sm">
                        {selectedItem.moderationResult.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Review Notes */}
              {selectedItem.status === 'pending' && (
                <div>
                  <label className="text-sm text-admin-text-secondary mb-2 block">
                    Review Notes (optional)
                  </label>
                  <textarea
                    className="w-full bg-admin-bg-card border border-admin-border rounded-lg px-3 py-2 text-admin-text resize-none"
                    rows={3}
                    placeholder="Add notes about your decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              )}

              {/* Actions */}
              {selectedItem.status === 'pending' && (
                <div className="border-t border-admin-border pt-4">
                  <label className="text-sm text-admin-text-secondary mb-3 block">
                    Take Action
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => handleReview('approve')}
                      isLoading={reviewMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleReview('escalate')}
                      isLoading={reviewMutation.isPending}
                    >
                      Escalate
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleReview('reject')}
                      isLoading={reviewMutation.isPending}
                    >
                      Remove Content
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleReview('reject_and_ban')}
                      isLoading={reviewMutation.isPending}
                    >
                      Remove + Ban
                    </Button>
                  </div>
                </div>
              )}

              {/* Completed review info */}
              {selectedItem.status !== 'pending' && (
                <div className="border-t border-admin-border pt-4">
                  <label className="text-sm text-admin-text-secondary">Review Decision</label>
                  <p className="text-admin-text mt-1">
                    <Badge
                      variant={
                        selectedItem.reviewDecision === 'approve'
                          ? 'success'
                          : selectedItem.reviewDecision?.includes('reject')
                            ? 'error'
                            : 'warning'
                      }
                    >
                      {selectedItem.reviewDecision?.replace('_', ' ') || 'N/A'}
                    </Badge>
                  </p>
                  {selectedItem.reviewNotes && (
                    <p className="text-admin-text-secondary text-sm mt-2">
                      Notes: {selectedItem.reviewNotes}
                    </p>
                  )}
                  {selectedItem.reviewedAt && (
                    <p className="text-admin-text-secondary text-sm mt-1">
                      Reviewed {formatRelativeTime(selectedItem.reviewedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

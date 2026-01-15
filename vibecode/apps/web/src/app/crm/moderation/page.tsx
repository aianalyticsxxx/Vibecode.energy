'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/ui/DataTable';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { Select } from '@/components/admin/ui/Select';
import { Modal } from '@/components/admin/ui/Modal';
import { adminApi, type AdminReport } from '@/lib/admin/api';
import { formatRelativeTime } from '@/lib/admin/utils';

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'reports', statusFilter, reasonFilter],
    queryFn: async () => {
      const params: { status?: string; reason?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (reasonFilter !== 'all') params.reason = reasonFilter;
      const response = await adminApi.getReports(params);
      return response.data;
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      status,
      actionTaken,
    }: {
      reportId: string;
      status: 'reviewed' | 'actioned' | 'dismissed';
      actionTaken?: 'none' | 'warning' | 'content_removed' | 'user_banned';
    }) => {
      return adminApi.updateReport(reportId, { status, actionTaken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSelectedReport(null);
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return adminApi.banUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  const deleteShotMutation = useMutation({
    mutationFn: async (shotId: string) => {
      return adminApi.deleteShot(shotId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return adminApi.deleteComment(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  const handleAction = async (
    action: 'dismiss' | 'warn' | 'remove_content' | 'ban'
  ) => {
    if (!selectedReport) return;

    const reportId = selectedReport.id;

    switch (action) {
      case 'dismiss':
        updateReportMutation.mutate({
          reportId,
          status: 'dismissed',
          actionTaken: 'none',
        });
        break;

      case 'warn':
        updateReportMutation.mutate({
          reportId,
          status: 'actioned',
          actionTaken: 'warning',
        });
        break;

      case 'remove_content':
        if (selectedReport.reportedShotId) {
          await deleteShotMutation.mutateAsync(selectedReport.reportedShotId);
        } else if (selectedReport.reportedCommentId) {
          await deleteCommentMutation.mutateAsync(selectedReport.reportedCommentId);
        }
        updateReportMutation.mutate({
          reportId,
          status: 'actioned',
          actionTaken: 'content_removed',
        });
        break;

      case 'ban':
        if (selectedReport.reportedUserId) {
          await banUserMutation.mutateAsync({
            userId: selectedReport.reportedUserId,
            reason: `Banned due to report: ${selectedReport.reason}`,
          });
        }
        updateReportMutation.mutate({
          reportId,
          status: 'actioned',
          actionTaken: 'user_banned',
        });
        break;
    }
  };

  const columns = [
    {
      key: 'reason',
      header: 'Reason',
      render: (report: AdminReport) => (
        <Badge
          variant={
            report.reason === 'harassment' || report.reason === 'inappropriate'
              ? 'error'
              : report.reason === 'spam'
                ? 'warning'
                : 'default'
          }
        >
          {report.reason}
        </Badge>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (report: AdminReport) => (
        <span>
          {report.reportedShotId
            ? 'Shot'
            : report.reportedCommentId
              ? 'Comment'
              : 'User'}
        </span>
      ),
    },
    {
      key: 'reported',
      header: 'Reported',
      render: (report: AdminReport) => (
        <span className="text-admin-text-secondary">
          {report.reportedUsername ? `@${report.reportedUsername}` : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'reporter',
      header: 'Reporter',
      render: (report: AdminReport) => (
        <span className="text-admin-text-secondary">@{report.reporterUsername}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (report: AdminReport) => (
        <Badge
          variant={
            report.status === 'pending'
              ? 'warning'
              : report.status === 'actioned'
                ? 'error'
                : report.status === 'dismissed'
                  ? 'default'
                  : 'success'
          }
        >
          {report.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Reported',
      render: (report: AdminReport) => (
        <span className="text-admin-text-secondary">{formatRelativeTime(report.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (report: AdminReport) =>
        report.status === 'pending' ? (
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReport(report);
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
          <h1 className="text-2xl font-bold text-admin-text">Moderation</h1>
          <p className="text-admin-text-secondary mt-1">
            Review and take action on user reports
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'reviewed', label: 'Reviewed' },
              { value: 'actioned', label: 'Actioned' },
              { value: 'dismissed', label: 'Dismissed' },
            ]}
          />
          <Select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Reasons' },
              { value: 'spam', label: 'Spam' },
              { value: 'harassment', label: 'Harassment' },
              { value: 'inappropriate', label: 'Inappropriate' },
              { value: 'impersonation', label: 'Impersonation' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data?.reports ?? []}
          keyExtractor={(report) => report.id}
          onRowClick={(report) => setSelectedReport(report)}
          isLoading={isLoading}
          emptyMessage="No reports found"
        />

        {/* Report Detail Modal */}
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title="Report Details"
          className="max-w-2xl"
        >
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-admin-text-secondary">Reason</label>
                  <p className="text-admin-text mt-1">
                    <Badge
                      variant={
                        selectedReport.reason === 'harassment'
                          ? 'error'
                          : selectedReport.reason === 'spam'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {selectedReport.reason}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-admin-text-secondary">Status</label>
                  <p className="text-admin-text mt-1">
                    <Badge
                      variant={selectedReport.status === 'pending' ? 'warning' : 'success'}
                    >
                      {selectedReport.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-admin-text-secondary">Reporter</label>
                  <p className="text-admin-text mt-1">@{selectedReport.reporterUsername}</p>
                </div>
                <div>
                  <label className="text-sm text-admin-text-secondary">Reported</label>
                  <p className="text-admin-text mt-1">
                    {selectedReport.reportedUsername
                      ? `@${selectedReport.reportedUsername}`
                      : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Details */}
              {selectedReport.details && (
                <div>
                  <label className="text-sm text-admin-text-secondary">Details</label>
                  <p className="text-admin-text mt-1 bg-admin-bg-card p-3 rounded-lg">
                    {selectedReport.details}
                  </p>
                </div>
              )}

              {/* Report Type */}
              <div>
                <label className="text-sm text-admin-text-secondary">Content Type</label>
                <p className="text-admin-text mt-1">
                  {selectedReport.reportedShotId
                    ? 'Shot'
                    : selectedReport.reportedCommentId
                      ? 'Comment'
                      : 'User Profile'}
                </p>
              </div>

              {/* Actions */}
              {selectedReport.status === 'pending' && (
                <div className="border-t border-admin-border pt-4">
                  <label className="text-sm text-admin-text-secondary mb-3 block">
                    Take Action
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => handleAction('dismiss')}
                      isLoading={updateReportMutation.isPending}
                    >
                      Dismiss Report
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleAction('warn')}
                      isLoading={updateReportMutation.isPending}
                    >
                      Warn User
                    </Button>
                    {(selectedReport.reportedShotId || selectedReport.reportedCommentId) && (
                      <Button
                        variant="danger"
                        onClick={() => handleAction('remove_content')}
                        isLoading={
                          deleteShotMutation.isPending ||
                          deleteCommentMutation.isPending ||
                          updateReportMutation.isPending
                        }
                      >
                        Remove Content
                      </Button>
                    )}
                    {selectedReport.reportedUserId && (
                      <Button
                        variant="danger"
                        onClick={() => handleAction('ban')}
                        isLoading={banUserMutation.isPending || updateReportMutation.isPending}
                      >
                        Ban User
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Taken */}
              {selectedReport.status !== 'pending' && selectedReport.actionTaken && (
                <div className="border-t border-admin-border pt-4">
                  <label className="text-sm text-admin-text-secondary">Action Taken</label>
                  <p className="text-admin-text mt-1">
                    <Badge variant={selectedReport.actionTaken === 'none' ? 'default' : 'error'}>
                      {selectedReport.actionTaken.replace('_', ' ')}
                    </Badge>
                  </p>
                  {selectedReport.reviewedAt && (
                    <p className="text-admin-text-secondary text-sm mt-2">
                      Reviewed {formatRelativeTime(selectedReport.reviewedAt)}
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

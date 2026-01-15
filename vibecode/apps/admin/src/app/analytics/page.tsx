'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Select } from '@/components/ui/Select';
import { adminApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await adminApi.getDashboardStats();
      return response.data;
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin', 'analytics', dateRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      const response = await adminApi.getAnalytics({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      return response.data;
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-admin-text">Analytics</h1>
            <p className="text-admin-text-secondary mt-1">
              Platform performance and engagement metrics
            </p>
          </div>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
          />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={statsLoading ? '...' : formatNumber(stats?.totalUsers ?? 0)}
            icon={<UsersIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Active Today"
            value={statsLoading ? '...' : formatNumber(stats?.activeToday ?? 0)}
            icon={<ActivityIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Total Shots"
            value={statsLoading ? '...' : formatNumber(stats?.totalShots ?? 0)}
            icon={<ImageIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Pending Reports"
            value={statsLoading ? '...' : stats?.pendingReports ?? 0}
            icon={<AlertIcon className="w-6 h-6" />}
          />
        </div>

        {/* Engagement Metrics */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-6">Engagement Metrics</h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-admin-text">
                {analyticsLoading ? '...' : formatNumber(analytics?.engagement?.dau ?? 0)}
              </p>
              <p className="text-admin-text-secondary mt-1">Daily Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-admin-text">
                {analyticsLoading ? '...' : formatNumber(analytics?.engagement?.wau ?? 0)}
              </p>
              <p className="text-admin-text-secondary mt-1">Weekly Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-admin-text">
                {analyticsLoading ? '...' : formatNumber(analytics?.engagement?.mau ?? 0)}
              </p>
              <p className="text-admin-text-secondary mt-1">Monthly Active Users</p>
            </div>
          </div>
        </div>

        {/* User Growth Chart Placeholder */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">User Growth</h2>
          {analyticsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : analytics?.userGrowth && analytics.userGrowth.length > 0 ? (
            <div className="h-64">
              <SimpleChart data={analytics.userGrowth} dataKey="count" color="#3B82F6" />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-admin-text-secondary">
              No data available
            </div>
          )}
        </div>

        {/* Content Stats Chart Placeholder */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">Content Activity</h2>
          {analyticsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : analytics?.contentStats && analytics.contentStats.length > 0 ? (
            <div className="h-64">
              <SimpleMultiChart data={analytics.contentStats} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-admin-text-secondary">
              No data available
            </div>
          )}
        </div>

        {/* Top Creators */}
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">Top Creators</h2>
          {analyticsLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : analytics?.topCreators && analytics.topCreators.length > 0 ? (
            <div className="space-y-4">
              {analytics.topCreators.map((creator, index) => (
                <div
                  key={creator.userId}
                  className="flex items-center justify-between p-3 bg-admin-bg-card rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-admin-text-secondary font-medium w-6">
                      #{index + 1}
                    </span>
                    <span className="text-admin-text font-medium">@{creator.username}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-admin-text-secondary">
                      {formatNumber(creator.shotCount)} shots
                    </span>
                    <span className="text-admin-accent">
                      {formatNumber(creator.sparkleCount)} sparkles
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-admin-text-secondary">
              No data available
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// Simple chart component (using CSS bars as a simple visualization)
function SimpleChart({
  data,
  dataKey,
  color,
}: {
  data: { date: string; count?: number }[];
  dataKey: string;
  color: string;
}) {
  const getValue = (d: { date: string; count?: number }) => {
    if (dataKey === 'count') return d.count || 0;
    return 0;
  };
  const maxValue = Math.max(...data.map(getValue));

  return (
    <div className="h-full flex items-end gap-1">
      {data.slice(-30).map((item, index) => {
        const value = getValue(item);
        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div
            key={index}
            className="flex-1 rounded-t transition-all hover:opacity-80"
            style={{
              height: `${height}%`,
              backgroundColor: color,
              minHeight: value > 0 ? '4px' : '0',
            }}
            title={`${item.date}: ${value}`}
          />
        );
      })}
    </div>
  );
}

function SimpleMultiChart({
  data,
}: {
  data: { date: string; shots: number; comments: number; sparkles: number }[];
}) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.shots || 0, d.comments || 0, d.sparkles || 0))
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-admin-text-secondary">Shots</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-admin-text-secondary">Comments</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-sm text-admin-text-secondary">Sparkles</span>
        </div>
      </div>
      <div className="flex-1 flex items-end gap-2">
        {data.slice(-20).map((item, index) => (
          <div key={index} className="flex-1 flex items-end gap-0.5">
            <div
              className="flex-1 bg-blue-500 rounded-t"
              style={{
                height: maxValue > 0 ? `${((item.shots || 0) / maxValue) * 100}%` : '0',
                minHeight: item.shots > 0 ? '2px' : '0',
              }}
            />
            <div
              className="flex-1 bg-green-500 rounded-t"
              style={{
                height: maxValue > 0 ? `${((item.comments || 0) / maxValue) * 100}%` : '0',
                minHeight: item.comments > 0 ? '2px' : '0',
              }}
            />
            <div
              className="flex-1 bg-yellow-500 rounded-t"
              style={{
                height: maxValue > 0 ? `${((item.sparkles || 0) / maxValue) * 100}%` : '0',
                minHeight: item.sparkles > 0 ? '2px' : '0',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Icon components
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

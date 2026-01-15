import { cn } from '@/lib/admin/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-admin-bg-elevated border border-admin-border rounded-xl p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-admin-text-secondary text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-admin-text mt-2">{value}</p>
          {change && (
            <p
              className={cn(
                'text-sm mt-2',
                changeType === 'positive' && 'text-admin-success',
                changeType === 'negative' && 'text-admin-error',
                changeType === 'neutral' && 'text-admin-text-secondary'
              )}
            >
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-admin-bg-card rounded-lg text-admin-text-secondary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

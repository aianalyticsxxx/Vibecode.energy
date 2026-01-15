import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/admin/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-admin-text-secondary"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-3 py-2 bg-admin-bg-card border border-admin-border rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-colors appearance-none cursor-pointer',
            error && 'border-admin-error focus:ring-admin-error',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-admin-error">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

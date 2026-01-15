import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/admin/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-admin-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 bg-admin-bg-card border border-admin-border rounded-lg text-admin-text placeholder:text-admin-text-dim focus:outline-none focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-colors',
            error && 'border-admin-error focus:ring-admin-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-admin-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

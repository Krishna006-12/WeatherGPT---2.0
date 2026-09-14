import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-subtle)]',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
  success:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  warning:
    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  destructive:
    'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
  outline:
    'border border-[var(--border-default)] bg-transparent text-[var(--text-secondary)]',
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, type BadgeProps, type BadgeVariant };

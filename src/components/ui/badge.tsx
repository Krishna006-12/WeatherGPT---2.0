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
    'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
  secondary:
    'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
  success:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  destructive:
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  outline:
    'border border-neutral-300 bg-transparent dark:border-neutral-700',
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

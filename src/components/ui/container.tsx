import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum width variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
};

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'lg', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeStyles[size], className)}
      {...props}
    />
  )
);

Container.displayName = 'Container';

export { Container, type ContainerProps };

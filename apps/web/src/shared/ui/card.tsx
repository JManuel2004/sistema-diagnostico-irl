import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * `Card` family aligned with `DESIGN.md`.
 *
 * The system favors **Gris 2 hairlines** (`#CECFD4`) over shadows to
 * convey depth — more readable on the low-DPI projectors used in INNLAB
 * workshops (RNF-08).
 *
 * The root is semantically neutral (`<div>`). Pages that need a landmark
 * wrap the card in a `<section aria-labelledby>` outside.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'border-border bg-card text-card-foreground rounded-md border transition-colors',
        className,
      )}
      {...props}
    />
  );
});

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
    );
  },
);

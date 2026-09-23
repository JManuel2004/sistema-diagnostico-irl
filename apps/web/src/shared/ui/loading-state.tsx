import type { JSX } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * `LoadingState` — loading state of a page or a block.
 *
 * A single treatment (spinner and text) for everything that waits for data,
 * instead of a different loose text per screen. The questionnaire skeleton
 * is separate on purpose: it reproduces the shape of the 48 cards, which a
 * generic indicator cannot.
 */
interface LoadingStateProps {
  readonly label: string;
  readonly className?: string;
}

export function LoadingState({ label, className }: LoadingStateProps): JSX.Element {
  return (
    <div
      role="status"
      className={cn('text-muted-foreground flex items-center gap-3 text-base', className)}
    >
      <span
        className="border-azul-icesi/40 size-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}

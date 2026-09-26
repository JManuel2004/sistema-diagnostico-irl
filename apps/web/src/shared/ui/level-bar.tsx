import type { JSX } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * `LevelBar` — the 1 to 9 scale as nine segments: the reached ones in the
 * dimension's color and the rest in grey. It is what makes a level
 * readable at a glance, without depending on the number.
 *
 * `targetLevel` paints in a soft tone the stretch missing up to the target
 * (the roadmap), and `thresholdLevel` marks with a line the last level that
 * counts as a gap. The number always goes along as accessible text too.
 */
interface LevelBarProps {
  readonly level: number;
  /** Background class of the full color (`getDimensionVisual().bg`). */
  readonly fillClass: string;
  /** Background class of the soft tone for the stretch up to the target. */
  readonly softClass?: string;
  readonly targetLevel?: number;
  readonly thresholdLevel?: number;
  /** How many segments the scale has: 9 for the IRL, 5 for the Likert. */
  readonly segments?: number;
  readonly className?: string;
}

export function LevelBar({
  level,
  fillClass,
  softClass,
  targetLevel,
  thresholdLevel,
  segments = 9,
  className,
}: LevelBarProps): JSX.Element {
  const label =
    targetLevel === undefined
      ? `Nivel ${String(level)} de ${String(segments)}`
      : `Nivel ${String(level)} de ${String(segments)}, con meta en el nivel ${String(targetLevel)}`;

  return (
    <div role="img" aria-label={label} className={cn('flex gap-1', className)}>
      {Array.from({ length: segments }, (_, i) => i + 1).map((segment) => {
        const reached = segment <= level;
        const towardTarget = !reached && targetLevel !== undefined && segment <= targetLevel;
        return (
          <span
            key={segment}
            aria-hidden="true"
            className={cn(
              'h-2 flex-1 rounded-sm',
              reached ? fillClass : towardTarget && softClass ? softClass : 'bg-border',
              thresholdLevel === segment && 'ring-foreground/40 ring-1 ring-offset-1',
            )}
          />
        );
      })}
    </div>
  );
}

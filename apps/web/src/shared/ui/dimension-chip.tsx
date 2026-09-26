import type { JSX } from 'react';
import type { DimensionCode } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { cn } from '@/shared/lib/utils';

/**
 * `DimensionChip` — the name of a dimension with its icon and its color, so
 * the same dimension is recognized the same way in the radar, the cards,
 * the pairs and the plan. The name always comes from the backend response.
 */
interface DimensionChipProps {
  readonly code: DimensionCode;
  readonly name: string;
  readonly className?: string;
}

export function DimensionChip({ code, name, className }: DimensionChipProps): JSX.Element {
  const visual = getDimensionVisual(code);
  const Icon = visual.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold',
        visual.chip,
        visual.textInk,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {name}
    </span>
  );
}

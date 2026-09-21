import type { JSX } from 'react';
import type { DimensionCode } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { cn } from '@/shared/lib/utils';

/**
 * `DimensionChip` — el nombre de una dimensión con su icono y su color, para
 * que la misma dimensión se reconozca igual en el radar, las tarjetas, los
 * pares y el plan. El nombre siempre lo recibe de la respuesta del backend.
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold',
        visual.tint,
        visual.textInk,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {name}
    </span>
  );
}

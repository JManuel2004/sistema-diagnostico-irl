import type { JSX } from 'react';
import type { DimensionCode, DimensionResult } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { cn } from '@/shared/lib/utils';

/**
 * Leyenda del radar: cada dimensión con su color y su nivel. Es interactiva:
 * pasar el cursor o enfocar un elemento lo resalta en el radar, y un clic lo
 * fija (otro clic sobre el mismo lo suelta). El color es el de la dimensión
 * (`getDimensionVisual`); el nombre y el nivel vienen de la respuesta.
 */
interface RadarLegendProps {
  readonly dimensionResults: readonly DimensionResult[];
  readonly highlighted: readonly DimensionCode[];
  readonly pinned: DimensionCode | null;
  readonly onHover: (codes: readonly DimensionCode[]) => void;
  readonly onPin: (code: DimensionCode) => void;
}

export function RadarLegend({
  dimensionResults,
  highlighted,
  pinned,
  onHover,
  onPin,
}: RadarLegendProps): JSX.Element {
  return (
    <ul aria-label="Leyenda del radar" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {dimensionResults.map((r) => {
        const visual = getDimensionVisual(r.dimensionCode);
        const isHighlighted = highlighted.includes(r.dimensionCode);
        return (
          <li key={r.dimensionCode}>
            <button
              type="button"
              aria-pressed={pinned === r.dimensionCode}
              onMouseEnter={() => {
                onHover([r.dimensionCode]);
              }}
              onMouseLeave={() => {
                onHover([]);
              }}
              onFocus={() => {
                onHover([r.dimensionCode]);
              }}
              onBlur={() => {
                onHover([]);
              }}
              onClick={() => {
                onPin(r.dimensionCode);
              }}
              className={cn(
                'border-border bg-background flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm',
                isHighlighted && 'border-border-strong',
              )}
            >
              <span aria-hidden="true" className={cn('size-3 shrink-0 rounded-full', visual.bg)} />
              <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                {r.shortName}
              </span>
              <span className="text-muted-foreground tabular-nums">{r.irlLevel}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

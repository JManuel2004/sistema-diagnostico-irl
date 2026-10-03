import type { JSX } from 'react';
import type { DimensionCode } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { LevelBar } from '@/shared/ui/level-bar';

/**
 * What the tooltip of a radar point explains: what the dimension is, what
 * it measures, at which level the initiative is and what that level means. The name comes from the
 * profile response and the description from the questionnaire catalog; the
 * frontend keeps neither.
 */
interface Props {
  readonly code: DimensionCode;
  readonly name: string;
  readonly level: number;
  readonly description?: string;
  /** What the level means for this dimension. */
  readonly levelDescription?: string | null;
}

export function DimensionTooltipContent({
  code,
  name,
  level,
  description,
  levelDescription,
}: Props): JSX.Element {
  const visual = getDimensionVisual(code);
  const Icon = visual.icon;
  return (
    <div className="flex w-64 flex-col gap-2">
      <p className={`${visual.textInk} flex items-center gap-2 text-base font-bold`}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {name}
      </p>
      {description !== undefined && description !== '' && (
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      )}
      <div>
        <p className="text-foreground text-sm font-semibold">Tu nivel: {level} de 9</p>
        <LevelBar level={level} fillClass={visual.bg} className="mt-1.5" />
        {levelDescription && (
          <p className="text-foreground mt-1.5 text-sm leading-relaxed">
            <span className="font-semibold">Estar en el nivel {level} significa: </span>
            {levelDescription}
          </p>
        )}
      </div>
    </div>
  );
}

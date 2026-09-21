import type { JSX } from 'react';
import type { DimensionCode } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { LevelBar } from '@/shared/ui/level-bar';

/**
 * Lo que explica el tooltip de una punta del radar: qué es la dimensión, qué
 * mide y en qué nivel está la iniciativa. El nombre viene de la respuesta del
 * perfil y la descripción del catálogo del cuestionario; el frontend no
 * mantiene ninguno de los dos.
 */
interface Props {
  readonly code: DimensionCode;
  readonly name: string;
  readonly level: number;
  readonly description?: string;
}

export function DimensionTooltipContent({ code, name, level, description }: Props): JSX.Element {
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
      </div>
    </div>
  );
}

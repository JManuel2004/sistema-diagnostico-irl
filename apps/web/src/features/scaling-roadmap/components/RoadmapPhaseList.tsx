import type { JSX } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { RoadmapResponse } from '@innlab/contracts';
import { getDimensionShortName } from '@/shared/lib/dimensions';
import { Card, CardContent } from '@/shared/ui/card';
import { RoadmapPhaseCard } from './RoadmapPhaseCard';

interface Props {
  readonly roadmap: RoadmapResponse;
}

/**
 * El roadmap completo: fases en orden y, al pie, las dimensiones que no
 * requieren intervención.
 *
 * Esa lista final no es decorativa. El roadmap cubre solo las
 * dimensiones a intervenir, no las seis, así que sin decir explícitamente
 * cuáles quedaron fuera la ausencia de una dimensión se leería como un
 * olvido del sistema en vez de como un resultado.
 */
export function RoadmapPhaseList({ roadmap }: Props): JSX.Element {
  if (roadmap.phases.length === 0) {
    return (
      <Card className="bg-surface-emphasis">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-acceptable mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-foreground text-lg font-semibold tracking-tight">
                Sin fases pendientes
              </h2>
              <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
                La iniciativa alcanza el nivel esperado en las seis dimensiones del marco, así que
                no hay una secuencia de escalamiento que proponer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ol className="flex flex-col">
        {roadmap.phases.map((phase, i) => (
          <RoadmapPhaseCard
            key={phase.order}
            phase={phase}
            isLast={i === roadmap.phases.length - 1}
          />
        ))}
      </ol>

      {roadmap.dimensionsWithoutIntervention.length > 0 && (
        <Card className="mt-2 border-dashed">
          <CardContent className="p-4">
            <h2 className="text-foreground text-sm font-semibold">Sin intervención en este plan</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {roadmap.dimensionsWithoutIntervention
                .map((c) => getDimensionShortName(c))
                .join(', ')}{' '}
              ya alcanzan el nivel esperado. Se consideraron al construir el roadmap y no requieren
              acción.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

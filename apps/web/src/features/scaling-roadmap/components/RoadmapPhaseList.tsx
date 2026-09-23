import type { JSX } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { RoadmapResponse } from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';
import { RoadmapPhaseCard } from './RoadmapPhaseCard';

interface Props {
  readonly roadmap: RoadmapResponse;
}

/**
 * The whole roadmap: the phases in order and, at the bottom, the dimensions
 * that need no intervention.
 *
 * That final list is not decorative. The roadmap covers only the
 * dimensions to intervene, not all six, so without saying explicitly which
 * ones were left out, a dimension's absence would read as an oversight of
 * the system instead of as a result.
 */
export function RoadmapPhaseList({ roadmap }: Props): JSX.Element {
  if (roadmap.phases.length === 0) {
    return (
      <Card className="bg-surface-muted rounded-2xl border-0">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-acceptable mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-foreground text-xl font-bold tracking-tight">
                Sin fases pendientes
              </h2>
              <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
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
          <CardContent className="p-5">
            <h2 className="text-foreground text-base font-semibold">
              Sin intervención en este plan
            </h2>
            <p className="text-muted-foreground mt-1 text-base leading-relaxed">
              {roadmap.dimensionsWithoutIntervention.map((d) => d.shortName).join(', ')} ya alcanzan
              el nivel esperado. Se consideraron al construir el roadmap y no requieren acción.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

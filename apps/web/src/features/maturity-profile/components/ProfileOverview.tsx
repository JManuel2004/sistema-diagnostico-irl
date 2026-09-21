import type { JSX } from 'react';
import { MousePointerClick } from 'lucide-react';
import type { DimensionCode, MaturityProfileResponse } from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';
import type { RadarHighlight } from '../hooks/useRadarHighlight';
import { MaturityRadarChart } from './MaturityRadarChart';
import { MaturityProfileSummary } from './MaturityProfileSummary';

/**
 * El perfil de madurez: el radar y, al lado, las señales que se leen de él.
 * Radar y tarjetas comparten el resaltado (`highlight`): pasar el cursor por
 * una punta del radar o por una tarjeta señala la misma dimensión en ambos.
 *
 * Cada punta del radar lleva el color de su dimensión y explica, en un tooltip,
 * qué mide (`descriptions`, del catálogo). No hay leyenda aparte: el color y el
 * nombre están en la punta.
 *
 * Los pares desequilibrados solo se dibujan en el radar cuando el análisis
 * profundo fue aceptado (`showImbalances`): antes forman parte de lo que
 * todavía no se muestra.
 */
interface Props {
  readonly profile: MaturityProfileResponse;
  readonly highlight: RadarHighlight;
  readonly showImbalances: boolean;
  readonly descriptions?: Readonly<Partial<Record<DimensionCode, string>>>;
}

export function ProfileOverview({
  profile,
  highlight,
  showImbalances,
  descriptions,
}: Props): JSX.Element {
  return (
    <section aria-labelledby="radar-heading" className="flex flex-col gap-4">
      <div>
        <p className="text-azul-icesi text-sm font-bold">Perfil de madurez</p>
        <h2 id="radar-heading" className="text-foreground mt-1 text-2xl font-bold leading-tight">
          Tu radar IRL
        </h2>
        <p className="text-muted-foreground mt-2 flex items-center gap-2 text-base">
          <MousePointerClick className="text-azul-icesi size-5 shrink-0" aria-hidden="true" />
          Pasa el cursor por cada punta para ver qué mide esa dimensión.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="bg-surface-emphasis">
          <CardContent className="flex h-full items-center p-4 md:p-6">
            <MaturityRadarChart
              dimensionResults={profile.dimensionResults}
              imbalances={showImbalances ? profile.imbalances : undefined}
              highlighted={highlight.highlighted}
              descriptions={descriptions}
              onHover={highlight.setHovered}
            />
          </CardContent>
        </Card>
        <MaturityProfileSummary
          dimensionResults={profile.dimensionResults}
          bottleneck={profile.bottleneck}
          strength={profile.strength}
          asymmetry={profile.asymmetry}
          gaps={profile.gaps}
          onHighlight={highlight.setHovered}
        />
      </div>
    </section>
  );
}

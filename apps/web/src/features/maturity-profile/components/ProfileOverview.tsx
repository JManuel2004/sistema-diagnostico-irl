import type { JSX } from 'react';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';
import type { RadarHighlight } from '../hooks/useRadarHighlight';
import { MaturityRadarChart } from './MaturityRadarChart';
import { MaturityProfileSummary } from './MaturityProfileSummary';
import { RadarLegend } from './RadarLegend';

/**
 * El perfil de madurez: radar con su leyenda y, al lado, las señales que
 * lee de él. Radar, leyenda y tarjetas comparten el resaltado (`highlight`).
 *
 * Los pares desequilibrados solo se dibujan en el radar cuando el análisis
 * profundo fue aceptado (`showImbalances`): antes forman parte de lo que
 * todavía no se muestra.
 */
interface Props {
  readonly profile: MaturityProfileResponse;
  readonly highlight: RadarHighlight;
  readonly showImbalances: boolean;
}

export function ProfileOverview({ profile, highlight, showImbalances }: Props): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="bg-surface-emphasis">
        <CardContent className="p-6 md:p-10">
          <MaturityRadarChart
            dimensionResults={profile.dimensionResults}
            imbalances={showImbalances ? profile.imbalances : undefined}
            highlighted={highlight.highlighted}
          />
          <RadarLegend
            dimensionResults={profile.dimensionResults}
            highlighted={highlight.highlighted}
            pinned={highlight.pinned}
            onHover={highlight.setHovered}
            onPin={highlight.togglePinned}
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
  );
}

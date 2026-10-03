import type { JSX } from 'react';
import { Layers, MousePointerClick } from 'lucide-react';
import type { DimensionCode, MaturityProfileResponse } from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';
import type { RadarHighlight } from '../hooks/useRadarHighlight';
import { MaturityRadarChart } from './MaturityRadarChart';
import { MaturityProfileSummary } from './MaturityProfileSummary';

/**
 * The maturity profile: the radar and, next to it, the signals read from
 * it. Radar and cards share the highlight (`highlight`): hovering a radar
 * point or a card points at the same dimension in both.
 *
 * Each radar point carries its dimension's color and explains, in a
 * tooltip, what it measures (`descriptions`, from the catalog). There is no
 * separate legend: the color and the name are on the point.
 *
 * The radar names each point by its code (TRL, TmRL…) to stay light; its
 * tooltip gives the dimension's name, what it measures and what the level
 * means, so a score is never left without its explanation. The cards
 * follow the highlight too: the ones it does not point at fade, as the
 * radar points do.
 *
 * The imbalanced pairs are only drawn on the radar when the deep analysis
 * was accepted (`showImbalances`): before that they are part of what is
 * not shown yet.
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
      <div className="flex gap-4 sm:gap-5">
        <span
          aria-hidden="true"
          className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12"
        >
          <Layers className="size-5 sm:size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow">Perfil de madurez</p>
          <h2 id="radar-heading" className="text-h2 text-foreground mt-2 max-sm:text-[1.625rem]">
            Tu radar IRL
          </h2>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 text-base">
            <MousePointerClick className="text-azul-icesi size-5 shrink-0" aria-hidden="true" />
            Pasa el cursor por cada punta para ver qué mide esa dimensión y qué significa tu nivel.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="bg-surface-muted rounded-2xl border-0">
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
          highlighted={highlight.highlighted}
          onHighlight={highlight.setHovered}
        />
      </div>
    </section>
  );
}

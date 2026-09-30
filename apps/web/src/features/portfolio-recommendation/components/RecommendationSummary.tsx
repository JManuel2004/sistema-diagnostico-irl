import type { JSX } from 'react';
import { Compass, Sparkles } from 'lucide-react';
import type { RecommendationResponse } from '@innlab/contracts';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { FALLBACK_SUBJECT } from '@/shared/lib/copy';

interface Props {
  readonly recommendation: RecommendationResponse;
  /** Name of the initiative, to address it. */
  readonly subject?: string;
}

/**
 * Result for the initiative leader.
 *
 * Deliberately without numbers: neither scores nor weights. The score is an
 * internal detail of the calibration and showing it invites discussing the
 * number instead of the recommendation. Whoever wants the breakdown has it
 * in the explanation of how it was reached.
 *
 * An alternative an adjustment of the center put into the ranking says so,
 * with the reason of the adjustment: it did not come from the calculation.
 */
export function RecommendationSummary({
  recommendation,
  subject = FALLBACK_SUBJECT,
}: Props): JSX.Element {
  if (recommendation.resultType === 'NO_RECOMMENDATION') {
    return (
      <section aria-labelledby="sin-recommendation">
        <Card className="bg-surface-muted rounded-2xl border-0">
          <CardContent className="p-6">
            <p className="text-azul-icesi text-sm font-bold">Portafolio INNLAB</p>
            <h2
              id="sin-recommendation"
              className="text-foreground mt-2 text-2xl font-bold tracking-tight"
            >
              Sin recomendación por ahora
            </h2>
            <p className="text-muted-foreground mt-3 max-w-prose text-lg leading-relaxed">
              {recommendation.noRecommendationReason}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const primary = recommendation.primary;

  return (
    <section aria-labelledby="service-recomendado">
      <Card className="border-border border-t-primary border-t-[3px]">
        <CardContent className="p-6 md:p-9">
          <Badge tone="info">
            <Sparkles className="size-4" aria-hidden="true" />
            Recomendado para {subject}
          </Badge>

          <div className="mt-4 flex items-start gap-4">
            <span className="bg-azul-icesi text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-full">
              <Compass className="size-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-muted-foreground text-base">Servicio de INNLAB</p>
              <h2
                id="service-recomendado"
                className="text-foreground text-3xl font-extrabold leading-tight tracking-tight"
              >
                {primary?.name}
              </h2>
            </div>
          </div>

          {recommendation.justification !== null && (
            <p className="text-foreground mt-5 max-w-prose text-lg leading-relaxed">
              {recommendation.justification}
            </p>
          )}

          {recommendation.alternatives.length > 0 && (
            <div className="border-border mt-6 border-t pt-5">
              <h3 className="text-foreground text-lg font-bold">También podrían encajar</h3>
              <ul className="mt-3 flex flex-wrap gap-3">
                {recommendation.alternatives.map((alt) => (
                  <li
                    key={alt.idService}
                    className="border-border bg-background text-foreground flex items-center gap-2 rounded-lg border px-4 py-2.5 text-base font-semibold"
                  >
                    <span
                      className="bg-azul-icesi/15 text-azul-icesi inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      aria-hidden="true"
                    >
                      {alt.position}
                    </span>
                    {alt.name}
                  </li>
                ))}
              </ul>
              {recommendation.alternatives
                .filter((alt) => alt.adjustmentReason !== null)
                .map((alt) => (
                  <p
                    key={alt.idService}
                    className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed"
                  >
                    <span className="text-foreground font-semibold">{alt.name}</span> la sugiere el
                    centro: {alt.adjustmentReason}
                  </p>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

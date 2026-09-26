import type { JSX } from 'react';
import { Gauge, Layers, Route } from 'lucide-react';
import type { DimensionResult } from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';
import { DimensionChip } from '@/shared/ui/dimension-chip';

/**
 * Context for someone who has never heard of IRL: what a level is, what a
 * dimension is and how the radar is read. Always visible on the results
 * page, before the radar.
 *
 * The names of the six dimensions come from the response, not from a
 * frontend list.
 */
interface Props {
  readonly dimensionResults: readonly DimensionResult[];
}

export function ProfileContext({ dimensionResults }: Props): JSX.Element {
  return (
    <Card className="bg-surface-muted rounded-2xl border-0">
      <CardContent className="p-6 md:p-8">
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Cómo leer estos resultados
        </h2>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          <div className="flex gap-4">
            <span className="bg-azul-icesi text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full">
              <Route className="size-6" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground text-base leading-relaxed">
              <span className="text-foreground block font-semibold">Qué es el IRL</span>
              El marco IRL (Innovation Readiness Level) mide qué tan preparada está una iniciativa
              para seguir avanzando: cuánto ha logrado y cuánto le falta.
            </p>
          </div>
          <div className="flex gap-4">
            <span className="bg-azul-icesi text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full">
              <Layers className="size-6" aria-hidden="true" />
            </span>
            <div className="text-muted-foreground text-base leading-relaxed">
              <span className="text-foreground block font-semibold">Qué es una dimensión</span>
              Es un área que se evalúa por separado. Son seis:
              <span className="mt-2 flex flex-wrap gap-2">
                {dimensionResults.map((r) => (
                  <DimensionChip key={r.dimensionCode} code={r.dimensionCode} name={r.shortName} />
                ))}
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="bg-azul-icesi text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full">
              <Gauge className="size-6" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground text-base leading-relaxed">
              <span className="text-foreground block font-semibold">Qué es un nivel</span>
              Cada dimensión recibe un nivel de 1 (muy inicial) a 9 (muy avanzado). El radar dibuja
              los seis: entre más lejos del centro está un punto, más avanzada es esa dimensión.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

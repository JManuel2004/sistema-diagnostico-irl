import type { JSX } from 'react';
import { ArrowRight } from 'lucide-react';
import type { RoadmapPhase } from '@innlab/contracts';
import { getDimensionShortName, getDimensionVisual } from '@/shared/lib/dimensions';

interface Props {
  readonly phase: RoadmapPhase;
  readonly isLast: boolean;
}

/**
 * Una fase del roadmap.
 *
 * Las dimensiones se muestran como una **grilla en paralelo**, no como
 * lista numerada, porque dentro de una fase no hay ninguna precedencia
 * entre ellas: el orden del array es canónico y sirve para que la
 * respuesta sea determinista, nada más. Numerarlas comunicaría una
 * prioridad que el sistema no calculó.
 */
export function RoadmapPhaseCard({ phase, isLast }: Props): JSX.Element {
  const enParalelo = phase.dimensions.length > 1;

  return (
    <li className="relative">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center self-stretch">
          <span
            className="bg-azul-icesi text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            aria-hidden="true"
          >
            {phase.order}
          </span>
          {!isLast && (
            <span className="bg-border mt-2 w-px flex-1" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 pb-8">
          <h3 className="text-foreground text-lg font-semibold tracking-tight">
            Fase {phase.order}
          </h3>
          {enParalelo && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              Estas {phase.dimensions.length} dimensiones se trabajan en
              paralelo: ninguna depende de la otra.
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {phase.dimensions.map((d) => {
              const visual = getDimensionVisual(d.dimensionCode);
              return (
                <article
                  key={d.dimensionCode}
                  className="border-border bg-surface rounded-lg border p-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`${visual.bg} size-2.5 rounded-full`}
                      aria-hidden="true"
                    />
                    <h4 className={`${visual.textInk} text-sm font-semibold`}>
                      {getDimensionShortName(d.dimensionCode)}
                    </h4>
                  </div>

                  <p className="text-foreground mt-3 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Nivel {d.currentLevel}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-semibold">Nivel {d.targetLevel}</span>
                  </p>

                  {d.enables.length > 0 && (
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                      Al alcanzarlo desbloquea{' '}
                      {d.enables.map((e) => getDimensionShortName(e)).join(', ')}.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </li>
  );
}

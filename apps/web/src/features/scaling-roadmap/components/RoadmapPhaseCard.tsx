import type { JSX } from 'react';
import { LockOpen } from 'lucide-react';
import type { RoadmapPhase } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { LevelBar } from '@/shared/ui/level-bar';
import { inclusionSentence, listNames, targetSentence } from '../utils/roadmap-explanation';

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
 *
 * Cada dimensión lleva su color, su barra de nivel (con el tramo que falta
 * hasta la meta en tono suave) y frases cortas que dicen por qué está en el
 * plan y por qué esa meta.
 */
export function RoadmapPhaseCard({ phase, isLast }: Props): JSX.Element {
  const enParalelo = phase.dimensions.length > 1;

  return (
    <li className="relative">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center self-stretch">
          <span
            className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold"
            aria-hidden="true"
          >
            {phase.order}
          </span>
          {!isLast && <span className="bg-azul-icesi/30 mt-2 w-0.5 flex-1" aria-hidden="true" />}
        </div>

        <div className="flex-1 pb-10">
          <h3 className="text-foreground text-xl font-bold tracking-tight">Fase {phase.order}</h3>
          <p className="text-muted-foreground mt-0.5 text-base">
            {enParalelo
              ? `Estas ${String(phase.dimensions.length)} dimensiones se trabajan al mismo tiempo: ninguna depende de la otra.`
              : 'Una sola dimensión en esta fase.'}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {phase.dimensions.map((d) => {
              const visual = getDimensionVisual(d.dimensionCode);
              const Icon = visual.icon;
              return (
                <article
                  key={d.dimensionCode}
                  className={`border-border bg-card overflow-hidden rounded-md border border-t-4 ${visual.border}`}
                >
                  <div className={`${visual.tint} flex items-center gap-2 px-4 py-3`}>
                    <Icon className={`${visual.textInk} size-5 shrink-0`} aria-hidden="true" />
                    <h4 className={`${visual.textInk} text-lg font-bold`}>{d.shortName}</h4>
                  </div>

                  <div className="flex flex-col gap-3 p-4">
                    <p className="text-foreground text-base">
                      De nivel <span className="font-bold">{d.currentLevel}</span> a nivel{' '}
                      <span className="font-bold">{d.targetLevel}</span>
                    </p>
                    <LevelBar
                      level={d.currentLevel}
                      targetLevel={d.targetLevel}
                      fillClass={visual.bg}
                      softClass={visual.soft}
                    />

                    <p className="text-foreground text-base leading-relaxed">
                      {inclusionSentence(d)} {targetSentence(d)}
                    </p>

                    {d.enables.length > 0 && (
                      <p className="text-muted-foreground flex items-start gap-2 text-base leading-relaxed">
                        <LockOpen className="mt-1 size-4 shrink-0" aria-hidden="true" />
                        <span>
                          Al llegar a su meta, {listNames(d.enables.map((e) => e.shortName))}{' '}
                          {d.enables.length === 1 ? 'podrá' : 'podrán'} avanzar.
                        </span>
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </li>
  );
}

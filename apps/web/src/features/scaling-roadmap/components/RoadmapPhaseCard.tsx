import type { JSX } from 'react';
import { ChevronDown, Compass, LockOpen } from 'lucide-react';
import type { DimensionCode, MaturityProfileResponse, RoadmapPhase } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { LevelBar } from '@/shared/ui/level-bar';
import { ServiceDetails } from '@/shared/ui/service-details';
import {
  inclusionSentence,
  listNames,
  phaseServiceReasons,
  stretchSentence,
  targetSentence,
} from '../utils/roadmap-explanation';

interface Props {
  readonly phase: RoadmapPhase;
  readonly isLast: boolean;
  /** What each level means, per dimension, to explain each phase's target. */
  readonly levelScale?: MaturityProfileResponse['levelScale'];
}

/**
 * A phase of the roadmap: the service that could be contracted for it and
 * the dimensions it works.
 *
 * The service comes first, with its card (what it is, what it can achieve,
 * which initiatives it suits) and «¿Por qué este servicio?», told from the
 * trace. When no service fits the phase, the best one is shown and the
 * card says so plainly.
 *
 * The dimensions are shown as a **parallel grid**, not as a numbered list,
 * because within a phase there is no precedence among them. Each one
 * carries its color, its level bar (the stretch this phase covers in a soft
 * tone), what reaching that level means, and short sentences that say why
 * it is in the plan and why that target. A rise above the limit per phase
 * says it continues in the next one.
 */
export function RoadmapPhaseCard({ phase, isLast, levelScale }: Props): JSX.Element {
  const inParallel = phase.dimensions.length > 1;
  const meaning = (code: DimensionCode, level: number): string | null =>
    levelScale?.[code]?.[level - 1] ?? null;

  return (
    <li className="relative">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center self-stretch">
          <span
            className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-xl font-extrabold"
            aria-hidden="true"
          >
            {phase.order}
          </span>
          {!isLast && <span className="bg-azul-icesi/30 mt-2 w-0.5 flex-1" aria-hidden="true" />}
        </div>

        <div className="min-w-0 flex-1 pb-10">
          <h3 className="text-foreground text-xl font-bold tracking-tight">Fase {phase.order}</h3>
          <p className="text-muted-foreground mt-0.5 text-base">
            {inParallel
              ? `Estas ${String(phase.dimensions.length)} dimensiones se trabajan al mismo tiempo: ninguna depende de la otra.`
              : 'Una sola dimensión en esta fase.'}
          </p>

          <PhaseService phase={phase} />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {phase.dimensions.map((d) => {
              const visual = getDimensionVisual(d.dimensionCode);
              const Icon = visual.icon;
              const reached = meaning(d.dimensionCode, d.targetLevel);
              const stretch = stretchSentence(d);
              return (
                <article
                  key={d.dimensionCode}
                  className="border-border bg-card overflow-hidden rounded-xl border"
                >
                  <div className="border-border flex items-center gap-2 border-b px-4 py-3">
                    <Icon className={`${visual.textInk} size-5 shrink-0`} aria-hidden="true" />
                    <h4 className="text-foreground text-lg font-bold">{d.shortName}</h4>
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
                    {reached && (
                      <p className="text-muted-foreground text-base leading-relaxed">
                        <span className="text-foreground font-semibold">
                          Al llegar al nivel {d.targetLevel}:{' '}
                        </span>
                        {reached}
                      </p>
                    )}

                    <p className="text-foreground text-base leading-relaxed">
                      {inclusionSentence(d)} {targetSentence(d)}
                    </p>
                    {stretch && (
                      <p className="text-muted-foreground text-base leading-relaxed">{stretch}</p>
                    )}

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

/** The service of the phase, with its card and why it was proposed. */
function PhaseService({ phase }: { readonly phase: RoadmapPhase }): JSX.Element {
  const service = phase.service;
  const reasons = phaseServiceReasons(phase);

  return (
    <div className="border-border border-t-azul-icesi bg-card mt-4 border border-t-[3px] p-4 sm:p-5">
      <p className="text-azul-icesi flex items-center gap-2 text-sm font-bold">
        <Compass className="size-4" aria-hidden="true" />
        Servicio para esta fase
      </p>
      {service ? (
        <>
          <h4 className="text-foreground mt-2 text-lg font-bold">{service.name}</h4>
          <p className="text-muted-foreground text-base">{service.subtitle}</p>
          {service.approximate && (
            <p className="text-foreground bg-surface-muted mt-3 p-3 text-base leading-relaxed">
              Ningún servicio del portafolio atiende bien esta fase. Este es el más cercano;
              conversa con INNLAB para ajustarlo a lo que necesitas.
            </p>
          )}
          <div className="mt-3">
            <ServiceDetails service={service} />
          </div>
        </>
      ) : (
        <p className="text-muted-foreground mt-2 text-base leading-relaxed">
          Ningún servicio del portafolio está disponible para esta fase. Las metas siguen siendo las
          de abajo; conversa con INNLAB para definir cómo trabajarlas.
        </p>
      )}
      {service && (
        <details className="mt-3">
          <summary className="text-azul-icesi inline-flex cursor-pointer items-center gap-1 text-base font-semibold">
            ¿Por qué este servicio?
            <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
            {reasons.map((reason) => (
              <li key={reason} className="text-muted-foreground text-base leading-relaxed">
                {reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

import type { JSX } from 'react';
import { CircleCheck, OctagonAlert, Siren, Target, TriangleAlert } from 'lucide-react';
import type {
  DimensionCode,
  ImbalanceClassification,
  MaturityProfileResponse,
} from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { GlossaryTerm } from '@/shared/ui/glossary-term';
import { LevelBar } from '@/shared/ui/level-bar';
import type { HighlightHandler } from './MaturityProfileSummary';
import { PairCard } from './PairCard';

/**
 * Lo que el perfil solo muestra con el análisis profundo aceptado: los pares
 * de dimensiones desequilibrados y las dimensiones en estado crítico.
 *
 * Ambos vienen calculados en la respuesta (`imbalances`, `criticalState`); aquí
 * solo se presentan, y con peso proporcional a la gravedad: primero lo crítico,
 * con color y texto que digan que es urgente. Pasar el cursor por un par o una
 * alerta resalta sus dimensiones en el radar.
 */
export interface PlanTarget {
  readonly targetLevel: number;
  readonly phase: number;
}

interface Props {
  readonly profile: MaturityProfileResponse;
  readonly onHighlight?: HighlightHandler;
  /** Qué mide cada dimensión, del catálogo del cuestionario. */
  readonly descriptions?: Readonly<Partial<Record<DimensionCode, string>>>;
  /** Meta y fase de cada dimensión en el roadmap, si ya se calculó. */
  readonly plan?: Readonly<Partial<Record<DimensionCode, PlanTarget>>>;
  /** Nombre de la iniciativa, para dirigirse a ella. */
  readonly subject?: string;
}

const RANK: Record<ImbalanceClassification, number> = { critical: 0, moderate: 1, acceptable: 2 };

function nextStep(level: number, target: PlanTarget | undefined): string {
  if (target === undefined) {
    return `Está en el nivel ${String(level)}, en la parte baja de la escala. Conviene atenderla antes que el resto.`;
  }
  return `Subir del nivel ${String(level)} al nivel ${String(target.targetLevel)}, en la fase ${String(target.phase)} del plan.`;
}

export function ImbalanceInsights({
  profile,
  onHighlight,
  descriptions,
  plan,
  subject = 'tu iniciativa',
}: Props): JSX.Element {
  const names = new Map(profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]));
  const levels = new Map(profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]));
  const label = (code: DimensionCode): string => names.get(code) ?? code;

  const pairs = [...(profile.imbalances ?? [])].sort(
    (a, b) => RANK[a.classification] - RANK[b.classification] || b.difference - a.difference,
  );
  const gapCodes = new Set<DimensionCode>(profile.gaps.dimensions);
  const criticalCodes = profile.criticalState.dimensions;
  const otherGaps = profile.gaps.dimensions.filter((c) => !criticalCodes.includes(c));
  const count = (c: ImbalanceClassification): number =>
    pairs.filter((p) => p.classification === c).length;

  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      <section aria-labelledby="imbalances-heading" className="flex flex-col gap-5">
        <header>
          <p className="text-eyebrow">Análisis de desequilibrios</p>
          <h3
            id="imbalances-heading"
            className="text-foreground mt-2 text-[1.375rem] font-bold leading-tight tracking-tight sm:text-2xl"
          >
            Qué tan parejo avanza {subject}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
            Un <GlossaryTerm term="imbalance">desequilibrio</GlossaryTerm> aparece cuando dos
            dimensiones que deberían avanzar juntas van a ritmos muy distintos. Comparamos seis
            pares. Con 2 o 3 niveles de diferencia es moderado; con más de 3, crítico.
          </p>
        </header>

        {pairs.length === 0 ? (
          <p className="text-muted-foreground text-base">No hay pares para evaluar todavía.</p>
        ) : (
          <>
            <p
              className="flex flex-wrap items-center gap-x-5 gap-y-2"
              aria-label="Resumen de los pares"
            >
              {count('critical') > 0 && (
                <Badge tone="critical">
                  <OctagonAlert className="size-4" aria-hidden="true" />
                  {count('critical')} {count('critical') === 1 ? 'crítico' : 'críticos'}
                </Badge>
              )}
              {count('moderate') > 0 && (
                <Badge tone="moderate">
                  <TriangleAlert className="size-4" aria-hidden="true" />
                  {count('moderate')} {count('moderate') === 1 ? 'moderado' : 'moderados'}
                </Badge>
              )}
              {count('acceptable') > 0 && (
                <Badge tone="acceptable">
                  <CircleCheck className="size-4" aria-hidden="true" />
                  {count('acceptable')} {count('acceptable') === 1 ? 'equilibrado' : 'equilibrados'}
                </Badge>
              )}
            </p>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {pairs.map((pair) => (
                <PairCard
                  key={`${pair.left}-${pair.right}`}
                  pair={pair}
                  names={names}
                  levels={levels}
                  bothInGap={gapCodes.has(pair.left) && gapCodes.has(pair.right)}
                  onHighlight={onHighlight}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="critical-heading" className="flex flex-col gap-5">
        <header>
          <p className="text-eyebrow !text-critical [&_button]:uppercase">
            Alertas de dimensiones <GlossaryTerm term="criticalState">críticas</GlossaryTerm>
          </p>
          <h3
            id="critical-heading"
            className="text-foreground mt-2 text-[1.375rem] font-bold leading-tight tracking-tight sm:text-2xl"
          >
            Qué atender primero en {subject}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
            Algunas dimensiones son clave: cuando están en nivel {profile.gaps.threshold} o menos,
            condicionan el avance de todo lo demás. Por eso son las primeras que se atienden.
          </p>
        </header>

        {criticalCodes.length === 0 ? (
          <Alert tone="acceptable" title="Ninguna dimensión clave está en estado crítico." />
        ) : (
          <ul className="flex flex-col gap-4">
            {criticalCodes.map((code) => {
              const visual = getDimensionVisual(code);
              const Icon = visual.icon;
              const level = levels.get(code) ?? 0;
              const description = descriptions?.[code];
              // Built as a spread, like `PairCard` and `MaturityProfileSummary`: the
              // `<article>` is a static block that only becomes a tab stop when there
              // is something to highlight, not an interactive element in itself.
              const highlight = onHighlight
                ? {
                    tabIndex: 0,
                    onMouseEnter: () => {
                      onHighlight([code]);
                    },
                    onMouseLeave: () => {
                      onHighlight([]);
                    },
                    onFocus: () => {
                      onHighlight([code]);
                    },
                    onBlur: () => {
                      onHighlight([]);
                    },
                  }
                : {};
              return (
                <li key={code}>
                  <article
                    aria-label={`${label(code)} está en estado crítico`}
                    className="border-border border-t-critical bg-card flex flex-col gap-4 border border-t-[3px] p-5 md:p-7"
                    {...highlight}
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <span
                        className={`border-border bg-background ${visual.textInk} flex size-12 shrink-0 items-center justify-center border`}
                      >
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <div className="min-w-[11rem] flex-1">
                        <h4 className="text-foreground text-xl font-bold">{label(code)}</h4>
                        {description !== undefined && (
                          <p className="text-muted-foreground mt-1 text-base leading-relaxed">
                            {description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-critical inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.06em]">
                          <Siren className="size-4" aria-hidden="true" />
                          Prioridad máxima
                        </span>
                        <span className="text-foreground text-2xl font-extrabold">
                          Nivel {level}
                        </span>
                      </div>
                    </div>

                    <LevelBar
                      level={level}
                      fillClass={visual.bg}
                      thresholdLevel={profile.gaps.threshold}
                    />

                    <p className="bg-surface-muted text-foreground flex items-start gap-3 p-3.5 text-base leading-relaxed">
                      <Target className="text-critical mt-0.5 size-5 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="font-semibold">Siguiente paso: </span>
                        {nextStep(level, plan?.[code])}
                      </span>
                    </p>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {otherGaps.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-foreground text-lg font-bold">
              Otras dimensiones en la parte baja
              <span className="text-muted-foreground ml-2 text-base font-medium">
                Prioridad media
              </span>
            </h4>
            <ul className="border-border flex flex-col border-t">
              {otherGaps.map((code) => {
                const visual = getDimensionVisual(code);
                const Icon = visual.icon;
                const level = levels.get(code) ?? 0;
                return (
                  <li
                    key={code}
                    className="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-4"
                    onMouseEnter={() => {
                      onHighlight?.([code]);
                    }}
                    onMouseLeave={() => {
                      onHighlight?.([]);
                    }}
                  >
                    <span
                      className={`border-border bg-background ${visual.textInk} flex size-10 shrink-0 items-center justify-center border`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-base font-semibold">{label(code)}</p>
                      <p className="text-muted-foreground text-base">
                        {nextStep(level, plan?.[code])}
                      </p>
                    </div>
                    <span className="text-foreground text-lg font-extrabold">Nivel {level}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {criticalCodes.length === 0 && otherGaps.length === 0 && (
          <p className="text-acceptable flex items-center gap-2 text-base font-medium">
            <CircleCheck className="size-5" aria-hidden="true" />
            Ninguna dimensión está en la parte baja de la escala.
          </p>
        )}
      </section>
    </div>
  );
}

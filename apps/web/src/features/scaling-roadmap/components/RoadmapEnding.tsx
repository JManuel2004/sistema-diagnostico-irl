import { useState, type JSX } from 'react';
import { CheckCircle2, Scale } from 'lucide-react';
import {
  DIMENSION_CODES,
  type DimensionCode,
  type ImbalancePairResult,
  type MaturityProfileResponse,
  type RoadmapResponse,
} from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { formatOneDecimal } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Chip } from '@/shared/ui/chip';
import { FALLBACK_SUBJECT } from '@/shared/lib/copy';

interface Props {
  readonly roadmap: RoadmapResponse;
  /** The profile today: where each dimension starts and its imbalanced pairs. */
  readonly profile: Pick<
    MaturityProfileResponse,
    'dimensionResults' | 'globalAverage' | 'imbalances'
  >;
  /** Short name of each dimension. */
  readonly dimensionNames?: Readonly<Record<string, string>>;
  /** Name of the initiative, to address it. */
  readonly subject?: string;
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Position of a level on the 1–9 scale, as a percentage of the track. */
const position = (level: number): string => `${String(((level - 1) / 8) * 100)}%`;

const PAIR_WORD: Record<ImbalancePairResult['classification'], string> = {
  critical: 'crítico',
  moderate: 'moderado',
  acceptable: 'sin alerta',
};

/**
 * «Al terminar la ruta»: what the whole route changes, today against the
 * end.
 *
 *  - Two or three figures: the imbalances with an alert, the global IRL
 *    level and how many dimensions go up.
 *  - Each dimension on the 1–9 scale: a hollow dot where it is today, a
 *    filled one where the route leaves it, and the segment between them.
 *  - The pairs that have to advance together, with their difference today
 *    (and its classification, from the profile) and at the end. Hovering a
 *    pair leaves only its two dimensions lit on the scale.
 *
 * Nothing is classified here: today's classification is the profile's,
 * and the end is told by the roadmap's `balanced`. The end of a pair is
 * only the difference of the two final levels; the global level at the end
 * is the same simple average the profile uses, over `finalLevels`.
 */
export function RoadmapEnding({
  roadmap,
  profile,
  dimensionNames,
  subject = FALLBACK_SUBJECT,
}: Props): JSX.Element {
  const [pair, setPair] = useState<readonly DimensionCode[]>([]);
  const today = new Map(profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]));
  const name = (code: DimensionCode): string => dimensionNames?.[code] ?? code;
  // A dimension the route does not move ends where it is today.
  const finalOf = (code: DimensionCode): number =>
    roadmap.finalLevels[code] ?? today.get(code) ?? 1;
  const todayOf = (code: DimensionCode): number => today.get(code) ?? finalOf(code);

  const finals = DIMENSION_CODES.map((code) => finalOf(code));
  const finalAverage = finals.reduce((sum, level) => sum + level, 0) / finals.length;
  const raised = DIMENSION_CODES.filter((code) => finalOf(code) > todayOf(code)).length;
  const pairs = profile.imbalances ?? [];
  const alertsToday = pairs.filter((p) => p.classification !== 'acceptable').length;

  const metrics: { label: string; today?: string; end: string; good: boolean }[] = [
    ...(pairs.length > 0
      ? [
          {
            label: 'Desequilibrios con alerta',
            today: String(alertsToday),
            end: roadmap.balanced ? '0' : 'Algunos',
            good: roadmap.balanced,
          },
        ]
      : []),
    {
      label: 'Nivel IRL global',
      today: formatOneDecimal(profile.globalAverage),
      end: formatOneDecimal(Math.round(finalAverage * 10) / 10),
      good: true,
    },
    {
      label: 'Dimensiones que suben',
      end: `${String(raised)} de ${String(DIMENSION_CODES.length)}`,
      good: true,
    },
  ];

  return (
    <section
      aria-labelledby="roadmap-ending"
      className={cn(
        'border-border mt-2 flex flex-col gap-6 border border-t-[3px] p-5 sm:p-7',
        roadmap.balanced ? 'border-t-acceptable' : 'border-t-moderate',
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className={cn(
              'flex items-center gap-2 text-sm font-bold',
              roadmap.balanced ? 'text-acceptable' : 'text-moderate',
            )}
          >
            {roadmap.balanced ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <Scale className="size-4" aria-hidden="true" />
            )}
            Al terminar la ruta
          </p>
          <h3
            id="roadmap-ending"
            className="text-foreground mt-2 text-2xl font-extrabold tracking-tight"
          >
            {roadmap.balanced
              ? `${subject} avanza pareja`
              : `${subject} avanza, pero no del todo pareja`}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
            {roadmap.balanced
              ? 'Tus dimensiones quedan parejas: ninguna pareja de dimensiones queda con un desequilibrio que genere alerta.'
              : 'Algunas dimensiones siguen quedando lejos entre sí: la ruta no alcanza a equilibrarlas.'}
          </p>
        </div>
        <p className="text-muted-foreground flex gap-5 text-sm" aria-hidden="true">
          <span className="inline-flex items-center gap-2">
            <span className="border-muted-foreground bg-background size-3.5 rounded-full border-2" />
            Hoy
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="bg-foreground size-3.5 rounded-full" />
            Al terminar
          </span>
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface-muted px-4 py-4">
            <dt className="text-foreground text-sm font-bold">{m.label}</dt>
            <dd className="mt-2 flex items-baseline gap-5">
              {m.today !== undefined && (
                <span className="flex flex-col">
                  <span className="text-muted-foreground text-sm">Hoy</span>
                  <span className="text-muted-foreground text-3xl font-extrabold tabular-nums">
                    {m.today}
                  </span>
                </span>
              )}
              <span className="flex flex-col">
                <span className="text-muted-foreground text-sm">Al terminar</span>
                <span
                  className={cn(
                    'text-3xl font-extrabold tabular-nums',
                    m.good ? 'text-acceptable' : 'text-moderate',
                  )}
                >
                  {m.end}
                </span>
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-start gap-7">
        <div className="min-w-0 flex-[999_1_30rem]">
          <div className="border-border grid grid-cols-[9rem_minmax(0,1fr)_3rem] items-center gap-3 border-b pb-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_3rem]">
            <span className="text-muted-foreground text-sm font-bold">Dimensión</span>
            <span className="relative mx-2 h-5" aria-hidden="true">
              {LEVELS.map((level) => (
                <span
                  key={level}
                  className="text-muted-foreground absolute -translate-x-1/2 text-sm font-semibold"
                  style={{ left: position(level) }}
                >
                  {level}
                </span>
              ))}
            </span>
            <span className="text-muted-foreground text-right text-sm font-bold">Sube</span>
          </div>
          <ul>
            {DIMENSION_CODES.map((code) => {
              const from = todayOf(code);
              const to = finalOf(code);
              const up = to - from;
              const visual = getDimensionVisual(code);
              const faded = pair.length > 0 && !pair.includes(code);
              return (
                <li
                  key={code}
                  className={cn(
                    'border-border/60 grid h-11 grid-cols-[9rem_minmax(0,1fr)_3rem] items-center gap-3 border-b transition-opacity sm:grid-cols-[11rem_minmax(0,1fr)_3rem]',
                    faded && 'opacity-30',
                  )}
                >
                  <span className={`${visual.textInk} flex items-center gap-2 text-base font-bold`}>
                    <span className={`${visual.bg} size-2.5 shrink-0 rounded-full`} />
                    {name(code)}
                  </span>
                  <span
                    role="img"
                    aria-label={`${name(code)}: hoy nivel ${String(from)}, al terminar nivel ${String(to)}`}
                    className="relative mx-2 h-5"
                  >
                    <span className="bg-border absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2" />
                    <span
                      className={`${visual.soft} absolute top-1/2 h-1.5 -translate-y-1/2`}
                      style={{ left: position(from), width: `${String((up / 8) * 100)}%` }}
                    />
                    <span
                      className="border-muted-foreground bg-background absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                      style={{ left: position(from) }}
                    />
                    <span
                      className="border-background absolute top-1/2 size-[1.125rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                      style={{
                        left: position(to),
                        backgroundColor: visual.fill,
                        boxShadow: `0 0 0 1px ${visual.color}`,
                      }}
                    />
                  </span>
                  <span
                    className={cn(
                      'text-right text-base font-extrabold tabular-nums',
                      up > 0 ? 'text-acceptable' : 'text-muted-foreground',
                    )}
                  >
                    {up > 0 ? `+${String(up)}` : 'igual'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {pairs.length > 0 && (
          <div className="flex flex-[1_1_18rem] flex-col gap-2">
            <h4 className="text-foreground mb-1 text-base font-bold">
              Parejas que deben avanzar juntas
            </h4>
            {pairs.map((p) => {
              const codes = [p.left, p.right] as const;
              const end = Math.abs(finalOf(p.left) - finalOf(p.right));
              const active = pair.length > 0 && pair[0] === p.left && pair[1] === p.right;
              const on = () => {
                setPair(codes);
              };
              const off = () => {
                setPair([]);
              };
              return (
                <button
                  key={`${p.left}-${p.right}`}
                  type="button"
                  onMouseEnter={on}
                  onMouseLeave={off}
                  onFocus={on}
                  onBlur={off}
                  className={cn(
                    'border-border bg-card flex w-full cursor-default items-center justify-between gap-3 border px-3 py-2 text-left transition-[opacity,box-shadow,border-color]',
                    active && 'border-azul-icesi ring-azul-icesi ring-1',
                    pair.length > 0 && !active && 'opacity-40',
                  )}
                >
                  <span className="text-foreground text-sm font-semibold">
                    {name(p.left)} y {name(p.right)}
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    <Chip
                      className="h-7"
                      tone={
                        p.classification === 'critical'
                          ? 'critical'
                          : p.classification === 'moderate'
                            ? 'moderate'
                            : 'neutral'
                      }
                    >
                      Hoy {p.difference}, {PAIR_WORD[p.classification]}
                    </Chip>
                    <Chip className="h-7" tone={roadmap.balanced ? 'acceptable' : 'neutral'}>
                      Al final {end}
                    </Chip>
                  </span>
                </button>
              );
            })}
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Diferencia de niveles entre las dos dimensiones de cada pareja.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

import type { JSX, ReactNode } from 'react';
import {
  Ban,
  ChevronDown,
  CircleCheck,
  Milestone,
  Scale,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { AppliedException, LayerTraceResponse, RankingEntry } from '@innlab/contracts';
import { Alert } from '@/shared/ui/alert';
import { DisclosurePanel } from '@/shared/ui/disclosure-panel';
import { LoadingState } from '@/shared/ui/loading-state';
import { Tooltip } from '@/shared/ui/tooltip';

interface Props {
  readonly trace: LayerTraceResponse | undefined;
  readonly isLoading: boolean;
  readonly onOpen: () => void;
  /**
   * Name of each dimension by its code, taken from the profile. The
   * explanation talks about «Negocio» and «Tecnología», never their acronyms.
   */
  readonly dimensionNames?: Readonly<Record<string, string>>;
}

/**
 * «Cómo se llegó a esta recomendación»: the calculation told in three
 * steps, for someone who knows neither the system nor the IRL framework.
 *
 *  1. Which services do not apply to the initiative.
 *  2. How the rest were ordered according to its profile.
 *  3. Whether the center had to adjust anything by hand.
 *
 * Four decisions carry the weight of this component:
 *
 *  1. The answer comes first: one sentence says which service came first
 *     and why. The detail of the calculation is below, for whoever wants to
 *     check it.
 *
 *  2. Contributions are told in **words** («es un servicio principal para
 *     Negocio») and not as scores. The number is a detail of the
 *     calibration; exposing it would move the conversation from "is this
 *     the right service?" to "why 1.50 and not 1.60?". The ones that group
 *     several dimensions are summed up in a label with their count
 *     («3 brechas»), but **which ones can always be known**: the label
 *     names them in its tooltip and repeats them in a text only screen
 *     readers read.
 *
 *  3. When the recommended service is NOT the one that won the
 *     calculation, it is said explicitly and at the very top. A system that
 *     presents a deliberate adjustment with the same face as a calculated
 *     result looks objective without being so, and that is exactly the
 *     confusion the trace exists to prevent.
 *
 *  4. No internal identifiers: adjustments are described by what they did
 *     and by the reason the center declared, not by their code.
 */
export function LayerTracePanel({ trace, isLoading, onOpen, dimensionNames }: Props): JSX.Element {
  const nameOf = (code: string): string => dimensionNames?.[code] ?? code;

  return (
    <DisclosurePanel
      id="trace-layers"
      title="Cómo se llegó a esta recomendación"
      icon={Target}
      onOpen={onOpen}
    >
      {isLoading && <LoadingState label="Cargando el detalle del cálculo…" />}

      {trace && (
        <div className="flex flex-col gap-6">
          <p className="bg-surface-muted border-primary text-foreground flex items-start gap-3 border-l-[3px] p-4 text-base leading-relaxed">
            <CircleCheck className="text-azul-icesi mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span>{verdict(trace)}</span>
          </p>

          {trace.adjustedByException && (
            <Alert
              tone="moderate"
              title="Esta recomendación proviene de un ajuste puntual del centro, no del resultado del cálculo."
            />
          )}

          {trace.incompleteCharacterization.length > 0 && (
            <p className="border-border text-muted-foreground border p-4 text-base leading-relaxed">
              Falta información de tu iniciativa:{' '}
              {trace.incompleteCharacterization.map(readableField).join(', ')}. El cálculo la trató
              como ausente, así que la recomendación es menos precisa de lo que podría ser.
            </p>
          )}

          <ol className="flex flex-col">
            <Step number={1} title="Lo que no aplica">
              {trace.layer1Excluded.length === 0 ? (
                <p className="text-muted-foreground text-base">
                  Ningún servicio quedó descartado: todos podían aplicar a tu iniciativa.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {trace.layer1Excluded.map((e) => (
                    <li key={e.idService} className="flex items-start gap-2.5 text-base">
                      <Ban
                        className="text-muted-foreground mt-1 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <p className="leading-relaxed">
                        <span className="text-foreground font-semibold">{e.name}. </span>
                        <span className="text-muted-foreground">{e.exclusionMessage}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Step>

            <Step number={2} title="El orden según tu perfil">
              <Ranking ranking={trace.rankingBeforeExceptions} nameOf={nameOf} />
            </Step>

            <Step number={3} title="Ajuste del centro">
              {trace.appliedExceptions.length === 0 ? (
                <p className="text-muted-foreground text-base">
                  No hizo falta ningún ajuste: el orden es el que salió del cálculo.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {trace.appliedExceptions.map((e) => (
                    <li key={e.code} className="flex flex-col gap-1.5">
                      <p className="flex items-start gap-2.5 text-base leading-relaxed">
                        <SlidersHorizontal
                          className="text-moderate mt-1 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="text-foreground font-semibold">
                            {adjustmentTitle(e)}
                          </span>{' '}
                          <span className="text-muted-foreground">{adjustmentPlace(e)}</span>
                        </span>
                      </p>
                      <details className="text-base">
                        <summary className="text-azul-icesi inline-flex cursor-pointer items-center gap-1 font-semibold">
                          Ver motivo
                          <ChevronDown className="size-4" aria-hidden="true" />
                        </summary>
                        <p className="text-muted-foreground mt-2 leading-relaxed">
                          {e.declaredReason}
                        </p>
                      </details>
                    </li>
                  ))}
                </ul>
              )}

              {trace.discardedExceptions.length > 0 && (
                <p className="text-muted-foreground mt-3 text-base">
                  {trace.discardedExceptions.length === 1
                    ? 'Se revisó otro ajuste posible, pero no aplica a tu iniciativa.'
                    : `Se revisaron otros ${String(trace.discardedExceptions.length)} ajustes posibles, pero no aplican a tu iniciativa.`}
                </p>
              )}
            </Step>
          </ol>
        </div>
      )}
    </DisclosurePanel>
  );
}

/** The sentence that answers, without reading the detail, why that service is recommended. */
function verdict(trace: LayerTraceResponse): string {
  const first = trace.rankingBeforeExceptions[0]?.name;
  const final = trace.rankingAfterExceptions[0]?.name ?? first;
  const adjustment = trace.appliedExceptions.find((e) => e.targetService === final);

  if (final === undefined) return 'Todavía no hay un orden de servicios para esta iniciativa.';
  if (trace.adjustedByException) {
    return `${final} es la recomendación porque el centro la eligió por encima del resultado del cálculo.`;
  }
  if (adjustment) {
    return `${final} fue la primera en el cálculo y, además, el centro la fija como primera opción.`;
  }
  return `${final} fue la primera en el cálculo por su afinidad con tu perfil.`;
}

/**
 * The order of the calculation. The first shows its reasons; the rest keep
 * them behind «Ver motivos», and from the fourth on the whole list folds:
 * whoever wants to check the full calculation can, without anyone else
 * reading it.
 */
function Ranking({
  ranking,
  nameOf,
}: {
  readonly ranking: readonly RankingEntry[];
  readonly nameOf: (code: string) => string;
}): JSX.Element {
  const visible = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="flex flex-col gap-2">
      <ol className="border-border flex flex-col border-t">
        {visible.map((r, index) => (
          <ServiceRow key={r.idService} entry={r} nameOf={nameOf} highlighted={index === 0} />
        ))}
      </ol>

      {rest.length > 0 && (
        <details>
          <summary className="border-border text-foreground inline-flex cursor-pointer items-center gap-1.5 border px-3 py-2 text-base font-semibold">
            <ChevronDown className="size-4" aria-hidden="true" />
            {rest.length === 1 ? '1 servicio más' : `${String(rest.length)} servicios más`}
          </summary>
          <ol className="border-border mt-2 flex flex-col border-t">
            {rest.map((r) => (
              <ServiceRow key={r.idService} entry={r} nameOf={nameOf} highlighted={false} />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function ServiceRow({
  entry,
  nameOf,
  highlighted,
}: {
  readonly entry: RankingEntry;
  readonly nameOf: (code: string) => string;
  readonly highlighted: boolean;
}): JSX.Element {
  const reasons = contributionReasons(entry, nameOf);

  return (
    <li className="border-border flex flex-col gap-2.5 border-b py-3">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-azul-icesi w-6 text-base font-extrabold" aria-hidden="true">
          {entry.position}
        </span>
        <span className="text-foreground text-base font-bold">
          <span className="sr-only">Puesto {entry.position}: </span>
          {entry.name}
        </span>
        {highlighted && (
          <span className="bg-azul-icesi text-primary-foreground px-2 py-1 text-sm font-bold uppercase tracking-[0.06em]">
            Recomendado
          </span>
        )}
      </p>

      {reasons.length === 0 ? (
        <p className="text-muted-foreground pl-9 text-base">
          No tiene una afinidad destacada con tu perfil.
        </p>
      ) : highlighted ? (
        <Reasons reasons={reasons} />
      ) : (
        <details className="pl-9">
          <summary className="text-azul-icesi inline-flex cursor-pointer items-center gap-1 text-base font-semibold">
            Ver motivos
            <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <div className="mt-2">
            <Reasons reasons={reasons} flush />
          </div>
        </details>
      )}
    </li>
  );
}

function Reasons({
  reasons,
  flush = false,
}: {
  readonly reasons: readonly Reason[];
  readonly flush?: boolean;
}): JSX.Element {
  return (
    <ul className={`flex flex-wrap gap-2 ${flush ? '' : 'pl-9'}`}>
      {reasons.map((m) => (
        <li key={m.label}>
          <ReasonLabel reason={m} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A reason label. When it sums up several dimensions («3 brechas»), saying
 * which ones is not optional: the tooltip names them on hover or keyboard
 * focus, and the same text travels in an `sr-only` for whoever uses a
 * screen reader or has no pointer.
 */
function ReasonLabel({ reason }: { readonly reason: Reason }): JSX.Element {
  const Icon = reason.icon;
  const className = `border-border bg-surface-muted inline-flex items-center gap-2 border px-2.5 py-1.5 text-base font-semibold ${
    reason.tone === 'moderate' ? 'text-moderate' : 'text-foreground'
  }`;

  if (reason.detail === undefined) {
    return (
      <span className={className}>
        <Icon className="text-azul-icesi size-4 shrink-0" aria-hidden="true" />
        {reason.label}
      </span>
    );
  }

  return (
    <Tooltip content={reason.detail}>
      <button type="button" className={`${className} cursor-help text-left`}>
        <Icon className="text-azul-icesi size-4 shrink-0" aria-hidden="true" />
        {reason.label}
        <span className="sr-only">. {reason.detail}</span>
      </button>
    </Tooltip>
  );
}

interface Reason {
  readonly icon: LucideIcon;
  readonly label: string;
  /** What is behind the count: the dimensions or the pairs, by name. */
  readonly detail?: string;
  readonly tone?: 'moderate';
}

/** «Negocio, Propiedad Intelectual y Financiación». */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * The contributions of a service, as labels.
 *
 * Only the dimensions where the service contributes something are named:
 * listing the `not_applicable` and `marginal` ones would lengthen the
 * explanation without adding information.
 */
function contributionReasons(
  ranking: RankingEntry,
  nameOf: (code: string) => string,
): readonly Reason[] {
  const c = ranking.contributions;
  if (!c) return [];

  const reasons: Reason[] = [];
  const isRelevant = (label: string): boolean => label === 'primary' || label === 'secondary';
  const roleOf = (label: string): string => (label === 'primary' ? 'principal' : 'de apoyo');

  const bottleneck = c.bottleneck.details.filter((d) => isRelevant(d.sourceLabel));
  for (const d of bottleneck) {
    reasons.push({
      icon: Target,
      label: `Cuello de botella: ${nameOf(d.dimension)}`,
      detail: `Es un servicio ${roleOf(d.sourceLabel)} para ${nameOf(d.dimension)}, lo que más frena tu avance.`,
    });
  }

  const gaps = c.gaps.details.filter((d) => isRelevant(d.sourceLabel));
  if (gaps.length > 0) {
    const names = gaps.map((d) => nameOf(d.dimension));
    reasons.push({
      icon: TrendingDown,
      label: gaps.length === 1 ? '1 brecha' : `${String(gaps.length)} brechas`,
      detail: `Ayuda a cerrar las brechas en ${joinNames(names)}.`,
    });
  }

  if (c.imbalances.details.length > 0) {
    const pairs = c.imbalances.details.map((d) => {
      const [a, b] = d.pair.split('-');
      return `${nameOf(a)} y ${nameOf(b)}`;
    });
    reasons.push({
      icon: Scale,
      label:
        c.imbalances.details.length === 1
          ? '1 desequilibrio'
          : `${String(c.imbalances.details.length)} desequilibrios`,
      detail: `Ayuda con el desequilibrio entre ${joinNames(pairs)}.`,
    });
  }

  if (c.stageAffinity.matches) {
    reasons.push({ icon: Milestone, label: 'Encaja con tu etapa' });
  }

  if (c.rangePenalty.applied) {
    reasons.push({
      icon: TriangleAlert,
      label: 'Pesa menos por su nivel',
      detail: 'Suele usarse con iniciativas de otro nivel de madurez, por eso pesa menos.',
      tone: 'moderate',
    });
  }

  return reasons;
}

function Step({
  number,
  title,
  children,
}: {
  readonly number: number;
  readonly title: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <li className="border-border grid grid-cols-[2rem_minmax(0,1fr)] gap-4 border-t py-4">
      <span
        className="bg-azul-icesi text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
        aria-hidden="true"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5">
        <h3 className="text-foreground text-base font-bold">
          <span className="sr-only">Paso {number}: </span>
          {title}
        </h3>
        {children}
      </div>
    </li>
  );
}

/**
 * Readable names of the characterization fields the backend reports as
 * missing. The code is stable; the text the user sees belongs to this
 * screen.
 */
const READABLE_FIELDS: Readonly<Record<string, string>> = {
  stage: 'la etapa',
  sector: 'el sector',
  teamSize: 'el tamaño del equipo',
  academicLinkage: 'la vinculación académica',
};

function readableField(field: string): string {
  return READABLE_FIELDS[field] ?? field;
}

const ACTION_TITLE: Record<AppliedException['action'], (service: string) => string> = {
  FORCE: (s) => `Se dejó ${s} como primera opción`,
  PROMOTE: (s) => `Se subió ${s} en el orden`,
  DEMOTE: (s) => `Se bajó ${s} en el orden`,
  VETO: (s) => `Se retiró ${s} de las opciones`,
};

function adjustmentTitle(e: AppliedException): string {
  return ACTION_TITLE[e.action](e.targetService);
}

/** Where the service was before the adjustment and where it ended up. */
function adjustmentPlace(e: AppliedException): string {
  const before = e.rankingBefore.find((r) => r.name === e.targetService)?.position;
  const after = e.rankingAfter.find((r) => r.name === e.targetService)?.position;
  if (before === undefined) return '';
  if (after === undefined) return `Estaba en el lugar ${String(before)}.`;
  if (before === after) return `Ya estaba en el lugar ${String(before)}.`;
  return `Pasó del lugar ${String(before)} al lugar ${String(after)}.`;
}

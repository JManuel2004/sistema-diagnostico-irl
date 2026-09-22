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
   * Nombre de cada dimensión por su código, tomado del perfil. La explicación
   * habla de «Negocio» y de «Tecnología», nunca de sus siglas.
   */
  readonly dimensionNames?: Readonly<Record<string, string>>;
}

/**
 * «Cómo se llegó a esta recomendación»: el cálculo contado en tres pasos, para
 * quien no conoce ni el sistema ni el marco IRL.
 *
 *  1. Qué servicios no aplican a la iniciativa.
 *  2. Cómo se ordenaron los demás según su perfil.
 *  3. Si el centro necesitó ajustar algo a mano.
 *
 * Cuatro decisiones que cargan el peso de este componente:
 *
 *  1. La respuesta va primero: una frase dice qué servicio quedó primero y por
 *     qué. El detalle del cálculo está debajo, para quien quiera comprobarlo.
 *     Antes cada servicio listaba todos sus aportes en frases completas, y la
 *     explicación se leía como un informe de auditoría.
 *
 *  2. Los aportes se cuentan en **palabras** («es un servicio principal para
 *     Negocio») y no como puntajes. El número es un detalle de la calibración;
 *     exponerlo desplazaría la conversación desde «¿es este el servicio
 *     adecuado?» hacia «¿por qué 1.50 y no 1.60?». Los que agrupan varias
 *     dimensiones se resumen en una etiqueta con su cuenta («3 brechas»), pero
 *     **siempre se puede saber cuáles**: la etiqueta las nombra en su tooltip y
 *     las repite en un texto que solo leen los lectores de pantalla.
 *
 *  3. Cuando el servicio recomendado NO es el que ganó el cálculo, se dice
 *     explícitamente y arriba del todo. Un sistema que presenta un ajuste
 *     deliberado con la misma cara que un resultado calculado parece
 *     objetivo sin serlo, y esa es exactamente la confusión que la traza
 *     existe para impedir.
 *
 *  4. Nada de identificadores internos: los ajustes se describen por lo que
 *     hicieron y por la razón que declaró el centro, no por su código.
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
            <span>{veredicto(trace)}</span>
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
              {trace.incompleteCharacterization.map(campoLegible).join(', ')}. El cálculo la trató
              como ausente, así que la recomendación es menos precisa de lo que podría ser.
            </p>
          )}

          <ol className="flex flex-col">
            <Paso numero={1} titulo="Lo que no aplica">
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
            </Paso>

            <Paso numero={2} titulo="El orden según tu perfil">
              <Ranking ranking={trace.rankingBeforeExceptions} nameOf={nameOf} />
            </Paso>

            <Paso numero={3} titulo="Ajuste del centro">
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
                          <span className="text-foreground font-semibold">{tituloAjuste(e)}</span>{' '}
                          <span className="text-muted-foreground">{lugarAjuste(e)}</span>
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
            </Paso>
          </ol>
        </div>
      )}
    </DisclosurePanel>
  );
}

/** La frase que responde, sin leer el detalle, por qué se recomienda ese servicio. */
function veredicto(trace: LayerTraceResponse): string {
  const primero = trace.rankingBeforeExceptions[0]?.name;
  const final = trace.rankingAfterExceptions[0]?.name ?? primero;
  const ajuste = trace.appliedExceptions.find((e) => e.targetService === final);

  if (final === undefined) return 'Todavía no hay un orden de servicios para esta iniciativa.';
  if (trace.adjustedByException) {
    return `${final} es la recomendación porque el centro la eligió por encima del resultado del cálculo.`;
  }
  if (ajuste) {
    return `${final} fue la primera en el cálculo y, además, el centro la fija como primera opción.`;
  }
  return `${final} fue la primera en el cálculo por su afinidad con tu perfil.`;
}

/**
 * El orden del cálculo. El primero muestra sus motivos; los demás los guardan
 * tras «Ver motivos», y del cuarto en adelante se pliega la lista entera: quien
 * quiera comprobar el cálculo completo puede, sin que nadie más lo lea.
 */
function Ranking({
  ranking,
  nameOf,
}: {
  readonly ranking: readonly RankingEntry[];
  readonly nameOf: (code: string) => string;
}): JSX.Element {
  const visibles = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div className="flex flex-col gap-2">
      <ol className="border-border flex flex-col border-t">
        {visibles.map((r, index) => (
          <Servicio key={r.idService} entry={r} nameOf={nameOf} destacado={index === 0} />
        ))}
      </ol>

      {resto.length > 0 && (
        <details>
          <summary className="border-border text-foreground inline-flex cursor-pointer items-center gap-1.5 border px-3 py-2 text-base font-semibold">
            <ChevronDown className="size-4" aria-hidden="true" />
            {resto.length === 1 ? '1 servicio más' : `${String(resto.length)} servicios más`}
          </summary>
          <ol className="border-border mt-2 flex flex-col border-t">
            {resto.map((r) => (
              <Servicio key={r.idService} entry={r} nameOf={nameOf} destacado={false} />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function Servicio({
  entry,
  nameOf,
  destacado,
}: {
  readonly entry: RankingEntry;
  readonly nameOf: (code: string) => string;
  readonly destacado: boolean;
}): JSX.Element {
  const motivos = aportes(entry, nameOf);

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
        {destacado && (
          <span className="bg-azul-icesi text-primary-foreground px-2 py-1 text-sm font-bold uppercase tracking-[0.06em]">
            Recomendado
          </span>
        )}
      </p>

      {motivos.length === 0 ? (
        <p className="text-muted-foreground pl-9 text-base">
          No tiene una afinidad destacada con tu perfil.
        </p>
      ) : destacado ? (
        <Motivos motivos={motivos} />
      ) : (
        <details className="pl-9">
          <summary className="text-azul-icesi inline-flex cursor-pointer items-center gap-1 text-base font-semibold">
            Ver motivos
            <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <div className="mt-2">
            <Motivos motivos={motivos} sinSangria />
          </div>
        </details>
      )}
    </li>
  );
}

function Motivos({
  motivos,
  sinSangria = false,
}: {
  readonly motivos: readonly Motivo[];
  readonly sinSangria?: boolean;
}): JSX.Element {
  return (
    <ul className={`flex flex-wrap gap-2 ${sinSangria ? '' : 'pl-9'}`}>
      {motivos.map((m) => (
        <li key={m.etiqueta}>
          <Etiqueta motivo={m} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Una etiqueta de motivo. Cuando resume varias dimensiones («3 brechas»), decir
 * cuáles no es opcional: el tooltip las nombra al pasar el cursor o al enfocarla
 * con el teclado, y el mismo texto viaja en un `sr-only` para quien use lector
 * de pantalla o no tenga puntero.
 */
function Etiqueta({ motivo }: { readonly motivo: Motivo }): JSX.Element {
  const Icon = motivo.icono;
  const clase = `border-border bg-surface-muted inline-flex items-center gap-2 border px-2.5 py-1.5 text-base font-semibold ${
    motivo.tono === 'moderate' ? 'text-moderate' : 'text-foreground'
  }`;

  if (motivo.detalle === undefined) {
    return (
      <span className={clase}>
        <Icon className="text-azul-icesi size-4 shrink-0" aria-hidden="true" />
        {motivo.etiqueta}
      </span>
    );
  }

  return (
    <Tooltip content={motivo.detalle}>
      <button type="button" className={`${clase} cursor-help text-left`}>
        <Icon className="text-azul-icesi size-4 shrink-0" aria-hidden="true" />
        {motivo.etiqueta}
        <span className="sr-only">. {motivo.detalle}</span>
      </button>
    </Tooltip>
  );
}

interface Motivo {
  readonly icono: LucideIcon;
  readonly etiqueta: string;
  /** Qué hay detrás de la cuenta: las dimensiones o los pares, por su nombre. */
  readonly detalle?: string;
  readonly tono?: 'moderate';
}

/** «Negocio, Propiedad Intelectual y Financiación». */
function enumerar(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Los aportes de un servicio, en etiquetas.
 *
 * Solo se nombran las dimensiones donde el servicio aporta algo: listar los
 * `not_applicable` y los `marginal` alargaría la explicación sin añadir
 * información.
 */
function aportes(ranking: RankingEntry, nameOf: (code: string) => string): readonly Motivo[] {
  const c = ranking.contributions;
  if (!c) return [];

  const motivos: Motivo[] = [];
  const relevante = (label: string): boolean => label === 'primary' || label === 'secondary';
  const como = (label: string): string => (label === 'primary' ? 'principal' : 'de apoyo');

  const cuello = c.bottleneck.details.filter((d) => relevante(d.sourceLabel));
  for (const d of cuello) {
    motivos.push({
      icono: Target,
      etiqueta: `Cuello de botella: ${nameOf(d.dimension)}`,
      detalle: `Es un servicio ${como(d.sourceLabel)} para ${nameOf(d.dimension)}, lo que más frena tu avance.`,
    });
  }

  const brechas = c.gaps.details.filter((d) => relevante(d.sourceLabel));
  if (brechas.length > 0) {
    const nombres = brechas.map((d) => nameOf(d.dimension));
    motivos.push({
      icono: TrendingDown,
      etiqueta: brechas.length === 1 ? '1 brecha' : `${String(brechas.length)} brechas`,
      detalle: `Ayuda a cerrar las brechas en ${enumerar(nombres)}.`,
    });
  }

  if (c.imbalances.details.length > 0) {
    const pares = c.imbalances.details.map((d) => {
      const [a, b] = d.pair.split('-');
      return `${nameOf(a)} y ${nameOf(b)}`;
    });
    motivos.push({
      icono: Scale,
      etiqueta:
        c.imbalances.details.length === 1
          ? '1 desequilibrio'
          : `${String(c.imbalances.details.length)} desequilibrios`,
      detalle: `Ayuda con el desequilibrio entre ${enumerar(pares)}.`,
    });
  }

  if (c.stageAffinity.matches) {
    motivos.push({ icono: Milestone, etiqueta: 'Encaja con tu etapa' });
  }

  if (c.rangePenalty.applied) {
    motivos.push({
      icono: TriangleAlert,
      etiqueta: 'Pesa menos por su nivel',
      detalle: 'Suele usarse con iniciativas de otro nivel de madurez, por eso pesa menos.',
      tono: 'moderate',
    });
  }

  return motivos;
}

function Paso({
  numero,
  titulo,
  children,
}: {
  readonly numero: number;
  readonly titulo: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <li className="border-border grid grid-cols-[2rem_minmax(0,1fr)] gap-4 border-t py-4">
      <span
        className="bg-azul-icesi text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
        aria-hidden="true"
      >
        {numero}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5">
        <h3 className="text-foreground text-base font-bold">
          <span className="sr-only">Paso {numero}: </span>
          {titulo}
        </h3>
        {children}
      </div>
    </li>
  );
}

/**
 * Nombres legibles de los campos de caracterización que el backend reporta
 * como ausentes. El código es estable; el texto que ve el usuario es de esta
 * pantalla.
 */
const CAMPOS_LEGIBLES: Readonly<Record<string, string>> = {
  stage: 'la etapa',
  sector: 'el sector',
  teamSize: 'el tamaño del equipo',
  academicLinkage: 'la vinculación académica',
};

function campoLegible(campo: string): string {
  return CAMPOS_LEGIBLES[campo] ?? campo;
}

const ACCION_TITULO: Record<AppliedException['action'], (servicio: string) => string> = {
  FORCE: (s) => `Se dejó ${s} como primera opción`,
  PROMOTE: (s) => `Se subió ${s} en el orden`,
  DEMOTE: (s) => `Se bajó ${s} en el orden`,
  VETO: (s) => `Se retiró ${s} de las opciones`,
};

function tituloAjuste(e: AppliedException): string {
  return ACCION_TITULO[e.action](e.targetService);
}

/** Dónde estaba el servicio antes y dónde quedó después del ajuste. */
function lugarAjuste(e: AppliedException): string {
  const antes = e.rankingBefore.find((r) => r.name === e.targetService)?.position;
  const despues = e.rankingAfter.find((r) => r.name === e.targetService)?.position;
  if (antes === undefined) return '';
  if (despues === undefined) return `Estaba en el lugar ${String(antes)}.`;
  if (antes === despues) return `Ya estaba en el lugar ${String(antes)}.`;
  return `Pasó del lugar ${String(antes)} al lugar ${String(despues)}.`;
}

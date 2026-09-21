import type { JSX, ReactNode } from 'react';
import {
  Ban,
  Milestone,
  Scale,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TriangleAlert,
} from 'lucide-react';
import type { AppliedException, LayerTraceResponse, RankingEntry } from '@innlab/contracts';
import { Alert } from '@/shared/ui/alert';
import { DisclosurePanel } from '@/shared/ui/disclosure-panel';
import { LoadingState } from '@/shared/ui/loading-state';

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
 * Tres decisiones que cargan el peso de este componente:
 *
 *  1. Los aportes se cuentan en **palabras** («es un servicio principal para
 *     Negocio») y no como puntajes. El número es un detalle de la calibración;
 *     exponerlo desplazaría la conversación desde «¿es este el servicio
 *     adecuado?» hacia «¿por qué 1.50 y no 1.60?».
 *
 *  2. Cuando el servicio recomendado NO es el que ganó el cálculo, se dice
 *     explícitamente y arriba del todo. Un sistema que presenta un ajuste
 *     deliberado con la misma cara que un resultado calculado parece
 *     objetivo sin serlo, y esa es exactamente la confusión que la traza
 *     existe para impedir.
 *
 *  3. Nada de identificadores internos: los ajustes se describen por lo que
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
        <div className="flex flex-col gap-8">
          <p className="text-muted-foreground max-w-prose text-base leading-relaxed">
            Primero descartamos lo que no aplica a tu iniciativa, luego ordenamos los demás
            servicios según tu perfil y, al final, revisamos si el centro necesita ajustar algo.
          </p>

          {trace.adjustedByException && (
            <Alert
              tone="moderate"
              title="Esta recomendación proviene de un ajuste puntual del centro, no del resultado del cálculo."
            />
          )}

          {trace.incompleteCharacterization.length > 0 && (
            <p className="border-border text-muted-foreground rounded-md border border-dashed p-4 text-base leading-relaxed">
              Falta información de tu iniciativa:{' '}
              {trace.incompleteCharacterization.map(campoLegible).join(', ')}. El cálculo la trató
              como ausente, así que la recomendación es menos precisa de lo que podría ser.
            </p>
          )}

          <Paso numero={1} titulo="Descartamos lo que no aplica">
            {trace.layer1Excluded.length === 0 ? (
              <p className="text-muted-foreground text-base">
                Ningún servicio quedó descartado: todos podían aplicar a tu iniciativa.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {trace.layer1Excluded.map((e) => (
                  <li
                    key={e.idService}
                    className="border-border bg-card flex items-start gap-3 rounded-md border p-4"
                  >
                    <Ban className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <p className="text-base leading-relaxed">
                      <span className="text-foreground font-semibold">{e.name}. </span>
                      <span className="text-muted-foreground">{e.exclusionMessage}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Paso>

          <Paso numero={2} titulo="Ordenamos los servicios según tu perfil">
            <ol className="flex flex-col gap-3">
              {trace.rankingBeforeExceptions.map((r) => (
                <li
                  key={r.idService}
                  className="border-border bg-card flex items-start gap-4 rounded-md border p-4"
                >
                  <span
                    className="bg-azul-icesi text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-base font-bold"
                    aria-hidden="true"
                  >
                    {r.position}
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground text-lg font-bold">{r.name}</p>
                    <Aportes ranking={r} nameOf={nameOf} />
                  </div>
                </li>
              ))}
            </ol>
          </Paso>

          <Paso numero={3} titulo="Revisamos si hace falta un ajuste">
            {trace.appliedExceptions.length === 0 ? (
              <p className="text-muted-foreground text-base">
                No hizo falta ningún ajuste: el orden es el que salió del cálculo.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {trace.appliedExceptions.map((e) => (
                  <li
                    key={e.code}
                    className="border-moderate/40 bg-moderate-bg flex items-start gap-3 rounded-md border p-4"
                  >
                    <SlidersHorizontal
                      className="text-moderate mt-0.5 size-5 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-foreground text-base font-bold">{tituloAjuste(e)}</p>
                      <p className="text-muted-foreground mt-1 text-base">{lugarAjuste(e)}</p>
                      <p className="text-foreground mt-2 text-base leading-relaxed">
                        <span className="font-semibold">Por qué: </span>
                        {e.declaredReason}
                      </p>
                    </div>
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
        </div>
      )}
    </DisclosurePanel>
  );
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
    <section>
      <h3 className="text-foreground mb-3 flex items-center gap-3 text-lg font-bold">
        <span
          className="bg-azul-icesi/15 text-azul-icesi flex size-8 shrink-0 items-center justify-center rounded-full text-base"
          aria-hidden="true"
        >
          {numero}
        </span>
        <span>
          <span className="sr-only">Paso {numero}: </span>
          {titulo}
        </span>
      </h3>
      {children}
    </section>
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

/**
 * Los aportes de un servicio, uno por línea y en palabras.
 *
 * Solo se nombran las dimensiones donde el servicio aporta algo: listar los
 * `not_applicable` y los `marginal` alargaría la explicación sin añadir
 * información.
 */
function Aportes({
  ranking,
  nameOf,
}: {
  readonly ranking: RankingEntry;
  readonly nameOf: (code: string) => string;
}): JSX.Element {
  const c = ranking.contributions;
  const lineas: { icono: typeof Target; texto: string }[] = [];

  if (c) {
    const relevante = (label: string): boolean => label === 'primary' || label === 'secondary';
    const como = (label: string): string => (label === 'primary' ? 'principal' : 'de apoyo');

    for (const d of c.bottleneck.details.filter((x) => relevante(x.sourceLabel))) {
      lineas.push({
        icono: Target,
        texto: `Es un servicio ${como(d.sourceLabel)} para ${nameOf(d.dimension)}, lo que más frena tu avance.`,
      });
    }
    const brechas = c.gaps.details.filter((x) => relevante(x.sourceLabel));
    if (brechas.length > 0) {
      lineas.push({
        icono: TrendingDown,
        texto: `Ayuda a cerrar las brechas en ${brechas.map((d) => nameOf(d.dimension)).join(', ')}.`,
      });
    }
    for (const d of c.imbalances.details) {
      const [a, b] = d.pair.split('-');
      lineas.push({
        icono: Scale,
        texto: `Ayuda con el desequilibrio entre ${nameOf(a)} y ${nameOf(b)}.`,
      });
    }
    if (c.stageAffinity.matches) {
      lineas.push({ icono: Milestone, texto: 'Encaja con la etapa de tu iniciativa.' });
    }
    if (c.rangePenalty.applied) {
      lineas.push({
        icono: TriangleAlert,
        texto: 'Suele usarse con iniciativas de otro nivel de madurez, por eso pesa menos.',
      });
    }
  }

  if (lineas.length === 0) {
    return (
      <p className="text-muted-foreground mt-1 text-base">
        No tiene una afinidad destacada con tu perfil.
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {lineas.map((l) => (
        <li key={l.texto} className="text-muted-foreground flex items-start gap-2 text-base leading-relaxed">
          <l.icono className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {l.texto}
        </li>
      ))}
    </ul>
  );
}

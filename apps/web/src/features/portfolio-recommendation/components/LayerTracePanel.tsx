import type { JSX } from 'react';
import type { LayerTraceResponse } from '@innlab/contracts';
import { Alert } from '@/shared/ui/alert';
import { DisclosurePanel } from '@/shared/ui/disclosure-panel';
import { LoadingState } from '@/shared/ui/loading-state';

interface Props {
  readonly trace: LayerTraceResponse | undefined;
  readonly isLoading: boolean;
  readonly onOpen: () => void;
}

/**
 * La vista de auditoría. Audiencia: el equipo de INNLAB.
 *
 * Colapsado por defecto porque no es lo que el líder de iniciativa
 * necesita ver, pero accesible sin cambiar de pantalla.
 *
 * Dos decisiones que cargan el peso de este componente:
 *
 *  1. Los aportes se muestran en **vocabulario ordinal** (`principal`,
 *     `secundario`) y no como números. El número es un detalle de la
 *     calibración; exponerlo desplazaría la conversación desde "¿es este
 *     el servicio adecuado?" hacia "¿por qué 1.50 y no 1.60?".
 *
 *  2. Cuando el servicio recomendado NO es el que ganó el cálculo, se dice
 *     explícitamente y arriba del todo. Un sistema que presenta un ajuste
 *     deliberado con la misma cara que un resultado calculado parece
 *     objetivo sin serlo, y esa es exactamente la confusión que la traza
 *     existe para impedir.
 */
export function LayerTracePanel({ trace, isLoading, onOpen }: Props): JSX.Element {
  return (
    <DisclosurePanel
      id="trace-layers"
      title="Cómo se llegó a esta recomendación"
      tag="Equipo INNLAB"
      onOpen={onOpen}
    >
      {isLoading && <LoadingState label="Cargando el detalle del cálculo…" />}

      {trace && (
        <div className="flex flex-col gap-6">
          {trace.adjustedByException && (
            <Alert
              tone="moderate"
              title="Esta recomendación proviene de un ajuste puntual del centro, no del resultado del cálculo."
            />
          )}

          {trace.incompleteCharacterization.length > 0 && (
            <p className="text-muted-foreground border-border rounded-md border border-dashed p-3 text-xs leading-relaxed">
              La iniciativa no tiene registro de{' '}
              {trace.incompleteCharacterization.map(campoLegible).join(', ')}. El cálculo los trató
              como ausentes, así que la recomendación es menos precisa de lo que podría ser.
            </p>
          )}

          <Bloque titulo="1 · Servicios descartados">
            {trace.layer1Excluded.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ningún servicio quedó excluido.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trace.layer1Excluded.map((e) => (
                  <li key={e.idService} className="text-sm">
                    <span className="text-foreground font-medium">{e.name}</span>
                    <span className="text-muted-foreground"> — {e.exclusionMessage}</span>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque titulo="2 · Orden según el cálculo">
            <ol className="flex flex-col gap-3">
              {trace.rankingBeforeExceptions.map((r) => (
                <li key={r.idService} className="text-sm">
                  <span className="text-foreground font-medium">
                    {r.position}. {r.name}
                  </span>
                  {r.contributions && (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {describirAportes(r.contributions)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Bloque>

          <Bloque titulo="3 · Ajustes puntuales">
            {trace.appliedExceptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No se aplicó ningún ajuste: el orden es el del cálculo.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {trace.appliedExceptions.map((e) => (
                  <li key={e.code} className="text-sm">
                    <p className="text-foreground font-medium">
                      {e.code} · {e.action} {e.targetService}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {e.declaredReason}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">{e.effect}</p>
                  </li>
                ))}
              </ul>
            )}

            {trace.discardedExceptions.length > 0 && (
              <details className="mt-4">
                <summary className="text-muted-foreground cursor-pointer text-xs">
                  {trace.discardedExceptions.length} ajuste(s) evaluados y no aplicados
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {trace.discardedExceptions.map((e) => (
                    <li key={e.code} className="text-muted-foreground text-xs">
                      <span className="font-medium">{e.code}</span> — {e.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Bloque>
        </div>
      )}
    </DisclosurePanel>
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

function Bloque({
  titulo,
  children,
}: {
  readonly titulo: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <h3 className="text-overline text-azul-icesi mb-2">{titulo}</h3>
      {children}
    </div>
  );
}

/**
 * Traduce el desglose numérico a una frase en vocabulario ordinal.
 *
 * Solo se nombran las dimensiones donde el servicio aporta algo: listar
 * los `no_aplica` alargaría la explicación sin añadir información.
 */
function describirAportes(
  contributions: NonNullable<
    LayerTraceResponse['rankingBeforeExceptions'][number]['contributions']
  >,
): string {
  const partes: string[] = [];

  const cuello = contributions.bottleneck.details.filter((d) => d.sourceLabel !== 'not_applicable');
  if (cuello.length > 0) {
    partes.push(
      `atiende la dimensión más rezagada (${cuello
        .map((d) => `${d.dimension}: ${d.sourceLabel}`)
        .join(', ')})`,
    );
  }

  const gaps = contributions.gaps.details.filter((d) => d.sourceLabel !== 'not_applicable');
  if (gaps.length > 0) {
    partes.push(
      `cubre brechas en ${gaps.map((d) => `${d.dimension} (${d.sourceLabel})`).join(', ')}`,
    );
  }

  if (contributions.imbalances.details.length > 0) {
    partes.push(
      `incide en los desequilibrios ${contributions.imbalances.details
        .map((d) => d.pair)
        .join(', ')}`,
    );
  }

  if (contributions.stageAffinity.matches) {
    partes.push('encaja con la etapa de la iniciativa');
  }

  if (contributions.rangePenalty.applied) {
    partes.push('penalizado por estar fuera de su rango de madurez habitual');
  }

  return partes.length > 0 ? partes.join('; ') + '.' : 'Sin afinidad destacable con este perfil.';
}

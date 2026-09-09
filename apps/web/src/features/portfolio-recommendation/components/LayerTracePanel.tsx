import { useState, type JSX } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { TrazaCapasResponse } from '@innlab/contracts';

interface Props {
  readonly traza: TrazaCapasResponse | undefined;
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
export function LayerTracePanel({ traza, isLoading, onOpen }: Props): JSX.Element {
  const [abierto, setAbierto] = useState(false);

  function alternar(): void {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente) onOpen();
  }

  return (
    <section className="border-border mt-8 rounded-lg border">
      <h2>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={abierto}
          aria-controls="traza-capas"
          className="text-foreground flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-semibold"
        >
          {abierto ? (
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          )}
          Cómo se llegó a esta recomendación
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            Equipo INNLAB
          </span>
        </button>
      </h2>

      <div id="traza-capas" hidden={!abierto} className="px-5 pb-6">
        {isLoading && (
          <p className="text-muted-foreground text-sm">Cargando la traza…</p>
        )}

        {traza && (
          <div className="flex flex-col gap-6">
            {traza.ajustadoPorExcepcion && (
              <p
                role="status"
                className="border-moderate/30 bg-moderate/5 text-moderate flex items-start gap-2 rounded-md border p-3 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Esta recomendación proviene de un ajuste puntual del centro, no
                  del resultado del cálculo.
                </span>
              </p>
            )}

            {traza.caracterizacionIncompleta.length > 0 && (
              <p className="text-muted-foreground border-border rounded-md border border-dashed p-3 text-xs leading-relaxed">
                La iniciativa no tiene registrados{' '}
                {traza.caracterizacionIncompleta.join(', ')}. El cálculo los trató
                como ausentes, así que la recomendación es menos precisa de lo que
                podría ser.
              </p>
            )}

            <Bloque titulo="1 · Servicios descartados">
              {traza.excluidosCapa1.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Ningún servicio quedó excluido.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {traza.excluidosCapa1.map((e) => (
                    <li key={e.idServicio} className="text-sm">
                      <span className="text-foreground font-medium">{e.nombre}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        — {e.mensajeExclusion}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloque>

            <Bloque titulo="2 · Orden según el cálculo">
              <ol className="flex flex-col gap-3">
                {traza.rankingPreExcepcion.map((r) => (
                  <li key={r.idServicio} className="text-sm">
                    <span className="text-foreground font-medium">
                      {r.posicion}. {r.nombre}
                    </span>
                    {r.aportes && (
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {describirAportes(r.aportes)}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </Bloque>

            <Bloque titulo="3 · Ajustes puntuales">
              {traza.excepcionesActivadas.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No se aplicó ningún ajuste: el orden es el del cálculo.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {traza.excepcionesActivadas.map((e) => (
                    <li key={e.codigo} className="text-sm">
                      <p className="text-foreground font-medium">
                        {e.codigo} · {e.accion} {e.servicioObjetivo}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {e.motivoDeclarado}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs italic">
                        {e.efecto}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {traza.excepcionesDescartadas.length > 0 && (
                <details className="mt-4">
                  <summary className="text-muted-foreground cursor-pointer text-xs">
                    {traza.excepcionesDescartadas.length} ajuste(s) evaluados y no
                    aplicados
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {traza.excepcionesDescartadas.map((e) => (
                      <li key={e.codigo} className="text-muted-foreground text-xs">
                        <span className="font-medium">{e.codigo}</span> — {e.razon}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Bloque>

            <p className="text-muted-foreground border-border border-t pt-4 text-xs">
              Versión de configuración {traza.versionConfiguracion} · calibración{' '}
              {traza.snapshotCalibracion} · parámetros {traza.snapshotParametros}.
              Evaluado el{' '}
              {new Date(traza.evaluadoEn).toLocaleString('es-CO', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
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
  aportes: NonNullable<TrazaCapasResponse['rankingPreExcepcion'][number]['aportes']>,
): string {
  const partes: string[] = [];

  const cuello = aportes.cuelloBotella.detalle.filter(
    (d) => d.etiquetaOrigen !== 'no_aplica',
  );
  if (cuello.length > 0) {
    partes.push(
      `atiende la dimensión más rezagada (${cuello
        .map((d) => `${d.dimension}: ${d.etiquetaOrigen}`)
        .join(', ')})`,
    );
  }

  const brechas = aportes.brechas.detalle.filter(
    (d) => d.etiquetaOrigen !== 'no_aplica',
  );
  if (brechas.length > 0) {
    partes.push(
      `cubre brechas en ${brechas
        .map((d) => `${d.dimension} (${d.etiquetaOrigen})`)
        .join(', ')}`,
    );
  }

  if (aportes.desequilibrios.detalle.length > 0) {
    partes.push(
      `incide en desequilibrios ${aportes.desequilibrios.detalle
        .map((d) => d.par)
        .join(', ')}`,
    );
  }

  if (aportes.afinidadEtapa.coincide) {
    partes.push('encaja con la etapa de la iniciativa');
  }

  if (aportes.penalizacionRango.aplicada) {
    partes.push('penalizado por estar fuera de su rango de madurez habitual');
  }

  return partes.length > 0
    ? partes.join('; ') + '.'
    : 'Sin afinidad destacable con este perfil.';
}

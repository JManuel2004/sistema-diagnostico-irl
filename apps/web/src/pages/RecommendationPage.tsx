import { useEffect, useState, type JSX } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  LayerTracePanel,
  RecommendationSummary,
  useAcceptDeepAnalysis,
  useRecommendation,
  useRecommendationTrace,
} from '@features/portfolio-recommendation';
import { PageShell } from '@/shared/ui/page-shell';
import { Card, CardContent } from '@/shared/ui/card';
import { ApiError } from '@/shared/api/http';

/**
 * `/diagnosticos/:id/recomendacion` — RF-15.
 *
 * Si la recomendación aún no existe el backend responde 409 con
 * `ROUTING_RECOMMENDATION_NOT_GENERATED`; eso no es un fallo sino el
 * state inicial. Quien llega a esta ruta lo hace porque quiere ver la
 * recomendación de portafolio, así que la página acepta el análisis
 * profundo automáticamente en vez de exigir un click adicional — no hay
 * ninguna otra razón para visitar esta URL.
 *
 * La página ya no dispara el cálculo de `routing/` directamente: acepta el
 * análisis profundo en `diagnosis/`, que publica un evento de dominio al
 * que `routing/` y `roadmap/` reaccionan cada uno por su cuenta. Como esas
 * reacciones son independientes, un fallo de `routing/` (p. ej. sin
 * configuración activa) ya no llega como error de la aceptación: se
 * manifiesta como que, tras aceptar, la recomendación sigue sin existir.
 * Distinguir ese 409 de un error real depende del `code` que el
 * interceptor conserva.
 */
export default function RecommendationPage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const [trazaSolicitada, setTrazaSolicitada] = useState(false);

  const { data: recommendation, error, isPending } = useRecommendation(diagnosticId);
  const aceptar = useAcceptDeepAnalysis(diagnosticId);
  const { mutate: aceptarAnalisis, isIdle: aceptarEsIdle } = aceptar;
  // Al aceptar, la mutación invalida la traza, así que si el panel está
  // abierto se refresca solo. No hace falta cerrarlo ni sincronizar state.
  const trace = useRecommendationTrace(diagnosticId, trazaSolicitada);

  const noGenerada =
    error instanceof ApiError && error.code === 'ROUTING_RECOMMENDATION_NOT_GENERATED';

  // `aceptarEsIdle` es lo que evita relanzar la mutación en cada render:
  // una vez que pasa a 'pending' (o falla), deja de ser idle y este efecto
  // no vuelve a dispararse aunque `noGenerada` siga en true.
  useEffect(() => {
    if (noGenerada && aceptarEsIdle) {
      aceptarAnalisis();
    }
  }, [noGenerada, aceptarEsIdle, aceptarAnalisis]);

  // La aceptación tuvo éxito y la relectura sigue sin encontrar la
  // recomendación: el cálculo de `routing/` falló del lado del servidor.
  const calculoFallo = aceptar.isSuccess && noGenerada;

  if (!diagnosticId) {
    return <Navigate to="/diagnosticos" replace />;
  }

  return (
    <PageShell width="standard" showAttribution>
      <header className="mb-8">
        <p className="text-overline text-azul-icesi">Análisis profundo</p>
        <h1 className="tracking-tightest text-foreground mt-2 text-[2.25rem] font-bold leading-tight">
          Recomendación de portafolio
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          A partir de tu perfil de madurez, el sistema identifica cuál de los services de INNLAB
          corresponde mejor al state actual de la iniciativa.
        </p>
      </header>

      {isPending && <p className="text-muted-foreground text-base">Cargando…</p>}

      {noGenerada && !aceptar.isError && !calculoFallo && (
        <p className="text-muted-foreground text-base">Generando recomendación…</p>
      )}

      {error && !noGenerada && (
        <Card role="alert" className="border-critical/30 bg-critical-bg">
          <CardContent className="p-4">
            <p className="text-critical text-sm font-semibold">
              No fue posible obtener la recomendación
            </p>
            <p className="text-critical mt-1 text-sm">
              {error instanceof ApiError && error.code === 'ROUTING_NO_ACTIVE_CONFIGURATION'
                ? 'No hay una configuración de enrutamiento active. Contacta al equipo de INNLAB.'
                : error instanceof ApiError && error.code === 'ROUTING_PROFILE_NOT_COMPUTED'
                  ? 'Este diagnóstico aún no tiene un perfil de madurez calculado.'
                  : error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {(aceptar.isError || calculoFallo) && (
        <Card role="alert" className="border-critical/30 bg-critical-bg mt-4">
          <CardContent className="p-4">
            <p className="text-critical text-sm font-semibold">
              {aceptar.error instanceof ApiError && aceptar.error.status === 409
                ? 'Este diagnóstico aún no tiene un perfil de madurez calculado.'
                : 'No fue posible generar la recomendación. Intenta de nuevo en unos minutos o contacta al equipo de INNLAB.'}
            </p>
          </CardContent>
        </Card>
      )}

      {recommendation && (
        <>
          <RecommendationSummary recommendation={recommendation} />
          <LayerTracePanel
            trace={trace.data}
            isLoading={trace.isFetching}
            onOpen={() => setTrazaSolicitada(true)}
          />
        </>
      )}
    </PageShell>
  );
}

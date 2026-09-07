import { useState, type JSX } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  LayerTracePanel,
  RecommendationSummary,
  useGenerateRecommendation,
  useRecommendation,
  useRecommendationTrace,
} from '@features/portfolio-recommendation';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { ApiError } from '@/shared/api/http';

/**
 * `/diagnosticos/:id/recomendacion` — RF-15.
 *
 * Si la recomendación aún no existe el backend responde 409 con
 * `ROUTING_RECOMMENDATION_NOT_GENERATED`; eso no es un fallo sino el
 * estado inicial, así que la página ofrece generarla. Distinguirlo de un
 * error real depende del `code` que el interceptor ahora conserva.
 */
export default function RecommendationPage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const [trazaSolicitada, setTrazaSolicitada] = useState(false);

  const { data: recomendacion, error, isPending } = useRecommendation(diagnosticId);
  const generar = useGenerateRecommendation(diagnosticId);
  // Al regenerar, la mutación invalida la traza, así que si el panel está
  // abierto se refresca solo. No hace falta cerrarlo ni sincronizar estado.
  const traza = useRecommendationTrace(diagnosticId, trazaSolicitada);

  if (!diagnosticId) {
    return <Navigate to="/diagnosticos" replace />;
  }

  const noGenerada =
    error instanceof ApiError &&
    error.code === 'ROUTING_RECOMMENDATION_NOT_GENERATED';

  return (
    <PageShell width="standard" showAttribution>
      <header className="mb-8">
        <p className="text-overline text-azul-icesi">Análisis profundo</p>
        <h1 className="tracking-tightest text-foreground mt-2 text-[2.25rem] font-bold leading-tight">
          Recomendación de portafolio
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          A partir de tu perfil de madurez, el sistema identifica cuál de los
          servicios de INNLAB corresponde mejor al estado actual de la iniciativa.
        </p>
      </header>

      {isPending && !noGenerada && (
        <p className="text-muted-foreground text-base">Cargando…</p>
      )}

      {noGenerada && !recomendacion && (
        <section className="border-border bg-surface-emphasis rounded-lg border p-6">
          <p className="text-foreground text-base">
            Todavía no has generado la recomendación para este diagnóstico.
          </p>
          <Button
            className="mt-4"
            onClick={() => generar.mutate()}
            disabled={generar.isPending}
          >
            {generar.isPending ? 'Generando…' : 'Generar recomendación'}
          </Button>
        </section>
      )}

      {error && !noGenerada && (
        <div
          role="alert"
          className="border-critical/30 bg-critical-bg rounded-md border p-4"
        >
          <p className="text-critical text-sm font-semibold">
            No fue posible obtener la recomendación
          </p>
          <p className="text-critical mt-1 text-sm">
            {error instanceof ApiError &&
            error.code === 'ROUTING_NO_ACTIVE_CONFIGURATION'
              ? 'No hay una configuración de enrutamiento vigente. Contacta al equipo de INNLAB.'
              : error instanceof ApiError &&
                  error.code === 'ROUTING_PROFILE_NOT_COMPUTED'
                ? 'Este diagnóstico aún no tiene un perfil de madurez calculado.'
                : error.message}
          </p>
        </div>
      )}

      {generar.isError && (
        <div
          role="alert"
          className="border-critical/30 bg-critical-bg mt-4 rounded-md border p-4"
        >
          <p className="text-critical text-sm font-semibold">
            {generar.error instanceof ApiError &&
            generar.error.code === 'ROUTING_NO_ACTIVE_CONFIGURATION'
              ? 'No hay una configuración de enrutamiento vigente. Contacta al equipo de INNLAB.'
              : 'No fue posible generar la recomendación. Intenta de nuevo en unos minutos.'}
          </p>
        </div>
      )}

      {recomendacion && (
        <>
          <RecommendationSummary recomendacion={recomendacion} />
          <LayerTracePanel
            traza={traza.data}
            isLoading={traza.isFetching}
            onOpen={() => setTrazaSolicitada(true)}
          />
        </>
      )}
    </PageShell>
  );
}

import type { JSX } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { RoadmapPhaseList, useScalingRoadmap } from '@features/scaling-roadmap';
import { PageShell } from '@/shared/ui/page-shell';
import { ApiError } from '@/shared/api/http';

/**
 * `/diagnosticos/:id/roadmap` — RF-14.
 *
 * Se consulta por separado de la recomendación de portafolio: son dos
 * lecturas independientes del mismo perfil, no una cadena. El roadmap no
 * llama al enrutador ni depende de él.
 */
export default function ScalingRoadmapPage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const { data: roadmap, error, isPending } = useScalingRoadmap(diagnosticId);

  if (!diagnosticId) {
    return <Navigate to="/diagnosticos" replace />;
  }

  return (
    <PageShell width="standard" showAttribution>
      <header className="mb-8">
        <p className="text-overline text-azul-icesi">Análisis profundo</p>
        <h1 className="tracking-tightest text-foreground mt-2 text-[2.25rem] font-bold leading-tight">
          Roadmap de escalamiento
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          Las dimensiones por debajo del nivel esperado, ordenadas según qué
          habilita qué: cada fase reúne lo que puede avanzarse a la vez, y
          espera a que lo anterior esté resuelto.
        </p>
      </header>

      {isPending && <p className="text-muted-foreground text-base">Cargando…</p>}

      {error && (
        <div
          role="alert"
          className="border-critical/30 bg-critical-bg rounded-md border p-4"
        >
          <p className="text-critical text-sm font-semibold">
            No fue posible construir el roadmap
          </p>
          <p className="text-critical mt-1 text-sm">
            {error instanceof ApiError && error.code === 'ROADMAP_GRAPH_HAS_CYCLE'
              ? 'El grafo de dependencias entre dimensiones está mal configurado. Contacta al equipo de INNLAB.'
              : error instanceof ApiError && error.status === 409
                ? 'Este diagnóstico aún no tiene un perfil de madurez calculado.'
                : 'Intenta de nuevo en unos minutos.'}
          </p>
        </div>
      )}

      {roadmap && <RoadmapPhaseList roadmap={roadmap} />}
    </PageShell>
  );
}

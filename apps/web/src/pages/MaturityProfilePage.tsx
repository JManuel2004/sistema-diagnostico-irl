import { useEffect, type JSX } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { MaturityProfilePanel, useComputeMaturityProfile } from '@features/maturity-profile';
import { PageShell } from '@/shared/ui/page-shell';
import { queryKeys } from '@/shared/api/query-keys';

/**
 * Página `/diagnosticos/:id/perfil` — visualización del perfil IRL (DIAGIRL-36).
 *
 * Flujo:
 *   1. Si el cache de React Query ya tiene el perfil (lo dejó la
 *      navegación desde `QuestionnairePage` tras un submit exitoso), se
 *      renderiza directo.
 *   2. Si no, se dispara el `computeMaturityProfile` automáticamente al
 *      montar la página. Esto cubre el caso de "el usuario abrió la
 *      URL manualmente" o "recargó la página".
 *
 * El cálculo es idempotente del lado del backend (replace-all
 * transaccional). Llamarlo dos veces no rompe nada — la última
 * ejecución sobreescribe la anterior con un `fecha_calculo` nuevo.
 *
 * Estados visuales:
 *   - Cargando → skeleton simple ("Calculando tu perfil...").
 *   - Error → mensaje con role="alert"; el usuario decide reintentar o
 *     volver al cuestionario.
 *   - Éxito → `MaturityProfilePanel` con el radar.
 */
export default function MaturityProfilePage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { mutate, data, error, isPending, isError, isIdle } = useComputeMaturityProfile();

  // Resolver el perfil: primero el cache (cuando se entra navegando
  // desde el cuestionario), luego el resultado de la mutation actual.
  const cachedProfile = diagnosticId
    ? queryClient.getQueryData<MaturityProfileResponse>(queryKeys.diagnostic.profile(diagnosticId))
    : undefined;
  const profile = cachedProfile ?? data;

  useEffect(() => {
    if (!diagnosticId) return;
    // Si ya hay perfil en cache, no re-dispara — evita el roundtrip
    // cuando venimos del cuestionario que acaba de calcularlo.
    if (cachedProfile) return;
    if (!isIdle) return;
    mutate(diagnosticId);
    // Los guards arriba (`cachedProfile`, `!isIdle`) cortocircuitan
    // cualquier re-ejecución cuando `isIdle` cambia true→false tras
    // `mutate`. Incluir todas las deps satisface al linter sin
    // re-disparar la mutación.
  }, [diagnosticId, cachedProfile, isIdle, mutate]);

  if (!diagnosticId) {
    return <Navigate to="/diagnosticos" replace />;
  }

  if (profile) {
    return <MaturityProfilePanel profile={profile} />;
  }

  if (isError) {
    return (
      <PageShell width="standard" showAttribution>
        <div
          role="alert"
          className="border-critical/30 bg-critical-bg mx-auto mt-12 max-w-xl rounded-md border p-6 text-center"
        >
          <p className="text-critical text-base font-semibold">
            No fue posible generar el diagnóstico
          </p>
          <p className="text-critical mt-2 text-sm">
            {error?.message ?? 'Por favor, intenta de nuevo en unos minutos.'}
          </p>
        </div>
      </PageShell>
    );
  }

  // isPending o isIdle (la mutation aún no arrancó porque acaba de montar).
  return (
    <PageShell width="standard" showAttribution>
      <div className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-4 text-center">
        <div
          className="border-azul-icesi/40 size-10 animate-spin rounded-full border-2 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-foreground text-base">
          {isPending ? 'Calculando tu perfil IRL…' : 'Cargando perfil…'}
        </p>
      </div>
    </PageShell>
  );
}

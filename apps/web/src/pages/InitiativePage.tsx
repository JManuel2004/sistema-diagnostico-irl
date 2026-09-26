import type { JSX } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { UserMenu } from '@features/auth';
import {
  InitiativeEditor,
  initiativeToFormValues,
  useInitiative,
  useRegisterInitiative,
} from '@features/initiative';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { useDiagnostic } from '@/shared/hooks/useDiagnostics';
import { notify } from '@/shared/ui/notify';
import { isApiErrorWithStatus } from '@/shared/api/http';
import { paths } from '@/shared/lib/paths';
import { RETRY_LATER } from '@/shared/lib/copy';

/**
 * `/diagnosticos/:id/iniciativa` — correct the initiative profile
 * (HU-06 / RF-04) once the wizard is finished; saving goes back to the panel.
 *
 * The first registration of the initiative is wizard step 1, not this
 * screen: if the diagnostic has no registered initiative yet, the user is
 * sent to the wizard, which knows which step it is on.
 *
 * Once the deep analysis is accepted the profile is frozen: the
 * recommendation and the roadmap were computed from it, and the backend
 * refuses the change (409). The screen says so instead of offering the form.
 */
export default function InitiativePage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const diagnostic = useDiagnostic(diagnosticId);
  const initiative = useInitiative(diagnosticId);
  const register = useRegisterInitiative(diagnosticId);

  if (!diagnosticId) {
    return <Navigate to={paths.panel} replace />;
  }

  if (initiative.data === null) {
    return <Navigate to={paths.wizard(diagnosticId)} replace />;
  }

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<UserMenu />}>
      <PageHeader
        overline="Tu iniciativa"
        title="Corrige la información de tu iniciativa"
        description="Estos datos contextualizan tus resultados y ayudan a INNLAB a recomendarte el servicio adecuado. Todos los campos son obligatorios."
      />

      {(initiative.isPending || diagnostic.isPending) && <LoadingState label="Cargando…" />}

      {(initiative.isError || diagnostic.isError) && (
        <Alert tone="critical" title="No fue posible cargar el formulario">
          {RETRY_LATER}
        </Alert>
      )}

      {initiative.data && diagnostic.data?.deepAnalysisAccepted === true && (
        <Alert tone="info" title="La información de esta iniciativa ya no se puede corregir">
          Aceptaste el análisis profundo y la recomendación y la ruta de escalamiento se calcularon
          con ella. Para diagnosticar la iniciativa con otra información, inicia un nuevo
          diagnóstico.
        </Alert>
      )}

      {initiative.data && diagnostic.data?.deepAnalysisAccepted === false && (
        <InitiativeEditor
          formKey={initiative.data.id}
          initial={initiativeToFormValues(initiative.data)}
          isSubmitting={register.isPending}
          submitLabel="Guardar cambios"
          onSubmit={(command) => {
            const initiativeId = initiative.data?.initiativeId ?? '';
            register.mutate(
              { initiativeId, ...command },
              {
                onSuccess: () => {
                  notify.success('Cambios guardados.');
                  void navigate(paths.panel);
                },
                onError: (error) => {
                  notify.error(
                    isApiErrorWithStatus(error, 404)
                      ? 'No encontramos este diagnóstico.'
                      : isApiErrorWithStatus(error, 409)
                        ? 'No fue posible guardar la iniciativa: el análisis profundo ya fue aceptado o el texto del consentimiento cambió. Recarga la página.'
                        : `No fue posible guardar la iniciativa. ${RETRY_LATER}`,
                  );
                },
              },
            );
          }}
        />
      )}
    </PageShell>
  );
}

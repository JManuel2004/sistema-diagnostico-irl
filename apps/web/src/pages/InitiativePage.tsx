import type { JSX } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { LogoutButton } from '@features/auth';
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
 */
export default function InitiativePage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const initiative = useInitiative(diagnosticId);
  const register = useRegisterInitiative(diagnosticId);

  if (!diagnosticId) {
    return <Navigate to={paths.panel} replace />;
  }

  if (initiative.data === null) {
    return <Navigate to={paths.wizard(diagnosticId)} replace />;
  }

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<LogoutButton />}>
      <PageHeader
        overline="Tu iniciativa"
        title="Corrige la información de tu iniciativa"
        description="Estos datos contextualizan tus resultados y ayudan a INNLAB a recomendarte el servicio adecuado. Todos los campos son obligatorios."
      />

      {initiative.isPending && <LoadingState label="Cargando…" />}

      {initiative.isError && (
        <Alert tone="critical" title="No fue posible cargar el formulario">
          {RETRY_LATER}
        </Alert>
      )}

      {initiative.data && (
        <InitiativeEditor
          formKey={initiative.data.id}
          initial={initiativeToFormValues(initiative.data)}
          isSubmitting={register.isPending}
          submitLabel="Guardar cambios"
          onSubmit={(command) => {
            register.mutate(command, {
              onSuccess: () => {
                notify.success('Cambios guardados.');
                void navigate(paths.panel);
              },
              onError: (error) => {
                notify.error(
                  isApiErrorWithStatus(error, 404)
                    ? 'No encontramos este diagnóstico.'
                    : `No fue posible guardar la iniciativa. ${RETRY_LATER}`,
                );
              },
            });
          }}
        />
      )}
    </PageShell>
  );
}

import type { JSX } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { LogoutButton } from '@features/auth';
import {
  InitiativeForm,
  initiativeToFormValues,
  useInitiative,
  useRegisterInitiative,
  useSectors,
  useStages,
} from '@features/initiative';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { ApiError } from '@/shared/api/http';
import { wizardPath } from './wizard/wizard-steps';

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
  const sectors = useSectors();
  const stages = useStages();
  const initiative = useInitiative(diagnosticId);
  const register = useRegisterInitiative(diagnosticId);

  if (!diagnosticId) {
    return <Navigate to="/panel" replace />;
  }

  if (initiative.data === null) {
    return <Navigate to={wizardPath(diagnosticId)} replace />;
  }

  const loading = sectors.isPending || stages.isPending || initiative.isPending;
  const failed = sectors.isError || stages.isError || initiative.isError;

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<LogoutButton />}>
      <PageHeader
        overline="Tu iniciativa"
        title="Corrige la información de tu iniciativa"
        description="Estos datos contextualizan tus resultados y ayudan a INNLAB a recomendarte el servicio adecuado. Todos los campos son obligatorios."
      />

      {loading && <LoadingState label="Cargando…" />}

      {failed && (
        <Alert tone="critical" title="No fue posible cargar el formulario">
          Intenta de nuevo en unos minutos.
        </Alert>
      )}

      {!loading && !failed && sectors.data && stages.data && initiative.data && (
        <InitiativeForm
          key={initiative.data.id}
          sectors={sectors.data}
          stages={stages.data}
          initial={initiativeToFormValues(initiative.data)}
          isSubmitting={register.isPending}
          submitLabel="Guardar cambios"
          submitError={
            register.isError
              ? register.error instanceof ApiError && register.error.status === 404
                ? 'No encontramos este diagnóstico.'
                : 'No fue posible guardar la iniciativa. Intenta de nuevo en unos minutos.'
              : undefined
          }
          onSubmit={(command) => {
            register.mutate(command, {
              onSuccess: () => {
                void navigate('/panel');
              },
            });
          }}
        />
      )}
    </PageShell>
  );
}

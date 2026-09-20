import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Initiative, RegisterInitiativeCommand } from '@innlab/contracts';
import {
  InitiativeForm,
  commandToFormValues,
  initiativeToFormValues,
  selectDraftClear,
  selectDraftSave,
  useInitiativeDraftStore,
  useRegisterInitiative,
  useSectors,
  useStages,
} from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  /** La iniciativa ya registrada, para corregirla, o `null`. */
  readonly registered: Initiative | null;
  /** El borrador del navegador si la iniciativa aún no se registra. */
  readonly draft: RegisterInitiativeCommand | null;
  /** El consentimiento ya está aceptado: la iniciativa puede guardarse ya. */
  readonly consentRecorded: boolean;
}

/**
 * Paso 1 — la información de la iniciativa (HU-06 / RF-04).
 *
 * Mientras el consentimiento no esté aceptado el formulario no se envía: se
 * guarda como borrador en el navegador y se registra al aceptar (paso 2). Si el
 * consentimiento ya está aceptado —el usuario volvió a corregir— se registra
 * en el acto.
 */
export function InitiativeStep({
  diagnosticId,
  registered,
  draft,
  consentRecorded,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const sectors = useSectors();
  const stages = useStages();
  const register = useRegisterInitiative(diagnosticId);
  const saveDraft = useInitiativeDraftStore(selectDraftSave);
  const clearDraft = useInitiativeDraftStore(selectDraftClear);

  const loading = sectors.isPending || stages.isPending;
  const failed = sectors.isError || stages.isError;
  const next = wizardPath(diagnosticId, 'consentimiento');

  const initial = registered
    ? initiativeToFormValues(registered)
    : draft
      ? commandToFormValues(draft)
      : undefined;

  function handleSubmit(command: RegisterInitiativeCommand): void {
    if (!consentRecorded) {
      saveDraft(command);
      void navigate(next);
      return;
    }
    register.mutate(command, {
      onSuccess: () => {
        clearDraft();
        void navigate(next);
      },
    });
  }

  return (
    <>
      <PageHeader
        overline="Paso 1 de 3"
        title="Cuéntanos de tu iniciativa"
        description="Estos datos contextualizan tus resultados y ayudan a INNLAB a recomendarte el servicio adecuado. Todos los campos son obligatorios."
      />

      {loading && <LoadingState label="Cargando…" />}

      {failed && (
        <Alert tone="critical" title="No fue posible cargar el formulario">
          Intenta de nuevo en unos minutos.
        </Alert>
      )}

      {!loading && !failed && sectors.data && stages.data && (
        <InitiativeForm
          key={registered?.id ?? 'draft'}
          sectors={sectors.data}
          stages={stages.data}
          initial={initial}
          isSubmitting={register.isPending}
          submitLabel="Continuar"
          submitError={
            register.isError
              ? 'No fue posible guardar la iniciativa. Intenta de nuevo en unos minutos.'
              : undefined
          }
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

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
  /** The already registered initiative, to correct it, or `null`. */
  readonly registered: Initiative | null;
  /** The browser draft if the initiative is not registered yet. */
  readonly draft: RegisterInitiativeCommand | null;
  /** The consent is already accepted: the initiative can be saved right away. */
  readonly consentRecorded: boolean;
}

/**
 * Step 1 — the information of the initiative (HU-06 / RF-04).
 *
 * While the consent is not accepted the form is not sent: it is kept as a
 * browser draft and registered on acceptance (step 2). If the consent is
 * already accepted — the user came back to correct it — it is registered
 * right away.
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

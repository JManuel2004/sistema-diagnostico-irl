import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Initiative, RegisterInitiativeCommand } from '@innlab/contracts';
import {
  InitiativeEditor,
  commandToFormValues,
  initiativeToFormValues,
  selectDraftClear,
  selectDraftSave,
  useInitiativeDraftStore,
  useRegisterInitiative,
} from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { wizardPath } from './wizard-steps';
import { RETRY_LATER } from '@/shared/lib/copy';

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
  const register = useRegisterInitiative(diagnosticId);
  const saveDraft = useInitiativeDraftStore(selectDraftSave);
  const clearDraft = useInitiativeDraftStore(selectDraftClear);

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

      <InitiativeEditor
        formKey={registered?.id ?? 'draft'}
        initial={initial}
        isSubmitting={register.isPending}
        submitLabel="Continuar"
        submitError={
          register.isError ? `No fue posible guardar la iniciativa. ${RETRY_LATER}` : undefined
        }
        onSubmit={handleSubmit}
      />
    </>
  );
}

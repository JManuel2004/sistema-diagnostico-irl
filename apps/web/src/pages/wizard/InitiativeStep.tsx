import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Initiative, InitiativeSummary } from '@innlab/contracts';
import {
  InitiativeChooser,
  InitiativeEditor,
  NEW_INITIATIVE,
  commandToFormValues,
  initiativeToFormValues,
  selectDraftClear,
  selectDraftSave,
  useInitiativeDraftStore,
  useRegisterInitiative,
  type InitiativeDraft,
  type InitiativeProfileFields,
} from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { notify } from '@/shared/ui/notify';
import { isApiErrorWithStatus } from '@/shared/api/http';
import { RETRY_LATER } from '@/shared/lib/copy';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  /** The profile already registered for this diagnostic, to correct it, or `null`. */
  readonly registered: Initiative | null;
  /** The browser draft if the profile is not registered yet. */
  readonly draft: InitiativeDraft | null;
  /** The user's initiatives, with their latest consent and profile. */
  readonly initiatives: readonly InitiativeSummary[];
}

function initialChoice(
  draft: InitiativeDraft | null,
  initiatives: readonly InitiativeSummary[],
): string {
  if (draft) return draft.initiativeId ?? NEW_INITIATIVE;
  return initiatives[0]?.id ?? NEW_INITIATIVE;
}

/**
 * Step 1 — which initiative the diagnostic is about and its information
 * (HU-06 / RF-04).
 *
 * The user chooses one of their initiatives — its latest profile fills the
 * form — or a new one. The consent belongs to the initiative: if the chosen
 * one already accepted the current text, the profile is registered right
 * away and the consent step is not needed. Otherwise (a new initiative, or
 * a text published after the last acceptance) the form is kept as a browser
 * draft and registered on acceptance (step 2).
 *
 * When the diagnostic already has a profile the user came back to correct
 * it: the initiative is fixed and there is nothing to choose.
 */
export function InitiativeStep({
  diagnosticId,
  registered,
  draft,
  initiatives,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const register = useRegisterInitiative(diagnosticId);
  const saveDraft = useInitiativeDraftStore(selectDraftSave);
  const clearDraft = useInitiativeDraftStore(selectDraftClear);
  const [choice, setChoice] = useState(() => initialChoice(draft, initiatives));

  const initiativeId = registered?.initiativeId ?? (choice === NEW_INITIATIVE ? null : choice);
  const chosen = initiatives.find((i) => i.id === initiativeId);

  const initial = registered
    ? initiativeToFormValues(registered)
    : draft?.initiativeId === initiativeId
      ? commandToFormValues(draft.command)
      : chosen?.latestProfile
        ? initiativeToFormValues(chosen.latestProfile)
        : undefined;

  function toConsent(command: InitiativeProfileFields): void {
    saveDraft({ initiativeId, command });
    void navigate(wizardPath(diagnosticId, 'consentimiento'));
  }

  function handleSubmit(command: InitiativeProfileFields): void {
    if (initiativeId === null || chosen?.consentCurrent !== true) {
      toConsent(command);
      return;
    }
    register.mutate(
      { initiativeId, ...command },
      {
        onSuccess: () => {
          clearDraft();
          notify.success('Iniciativa guardada.');
          void navigate(wizardPath(diagnosticId, 'cuestionario'));
        },
        onError: (error) => {
          // The text changed since the list was read: the consent step asks for it.
          if (isApiErrorWithStatus(error, 409)) {
            toConsent(command);
            return;
          }
          notify.error(`No fue posible guardar la iniciativa. ${RETRY_LATER}`);
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Cuéntanos de tu iniciativa"
        description="Estos datos contextualizan tus resultados y ayudan a INNLAB a recomendarte el servicio adecuado. Todos los campos son obligatorios."
      />

      {!registered && initiatives.length > 0 && (
        <InitiativeChooser initiatives={initiatives} value={choice} onChange={setChoice} />
      )}

      <InitiativeEditor
        formKey={registered?.id ?? initiativeId ?? NEW_INITIATIVE}
        initial={initial}
        isSubmitting={register.isPending}
        submitLabel="Continuar"
        onSubmit={handleSubmit}
      />
    </>
  );
}

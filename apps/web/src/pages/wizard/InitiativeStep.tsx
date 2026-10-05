import { useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Initiative, InitiativeSummary } from '@innlab/contracts';
import { useRecordConsent } from '@features/consent';
import {
  InitiativeChooser,
  InitiativeEditor,
  NEW_INITIATIVE,
  commandToFormValues,
  initiativeToFormValues,
  profileFieldsFromForm,
  selectClearAcceptance,
  selectDraftClear,
  selectDraftSave,
  useCreateInitiative,
  useInitiativeDraftStore,
  useRegisterInitiative,
  type InitiativeDraft,
  type InitiativeFormValues,
  type InitiativeProfileFields,
} from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { notify } from '@/shared/ui/notify';
import { buttonVariants } from '@/shared/ui/button';
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
  /** The consent text accepted on the previous step. */
  readonly acceptedTermsVersion: string | null;
}

function initialChoice(
  draft: InitiativeDraft | null,
  initiatives: readonly InitiativeSummary[],
): string {
  if (draft) return draft.initiativeId ?? NEW_INITIATIVE;
  return initiatives[0]?.id ?? NEW_INITIATIVE;
}

/**
 * Step 2 — which initiative the diagnostic is about and its information
 * (HU-06 / RF-04).
 *
 * The consent was accepted on the previous step. Continuing records that
 * acceptance on the initiative — creating one when the user chose «new» —
 * and then registers the profile. An initiative that already accepted the
 * current text only registers the profile. Correcting a profile that is
 * already registered does not ask for the consent again.
 */
export function InitiativeStep({
  diagnosticId,
  registered,
  draft,
  initiatives,
  acceptedTermsVersion,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const createInitiative = useCreateInitiative();
  const recordConsent = useRecordConsent();
  const register = useRegisterInitiative(diagnosticId);
  const saveDraft = useInitiativeDraftStore(selectDraftSave);
  const clearDraft = useInitiativeDraftStore(selectDraftClear);
  const clearAcceptance = useInitiativeDraftStore(selectClearAcceptance);
  const [choice, setChoice] = useState(() => initialChoice(draft, initiatives));

  const initiativeId = registered?.initiativeId ?? (choice === NEW_INITIATIVE ? null : choice);
  const chosen = initiatives.find((initiative) => initiative.id === initiativeId);
  const busy = createInitiative.isPending || recordConsent.isPending || register.isPending;

  const initial = registered
    ? initiativeToFormValues(registered)
    : draft?.initiativeId === initiativeId
      ? commandToFormValues(draft.command)
      : chosen?.latestProfile
        ? initiativeToFormValues(chosen.latestProfile)
        : undefined;

  function remember(command: InitiativeProfileFields): void {
    saveDraft({ initiativeId, command });
  }

  function rememberForm(values: InitiativeFormValues): void {
    const command = profileFieldsFromForm(values);
    if (command) remember(command);
  }

  async function handleSubmit(command: InitiativeProfileFields): Promise<void> {
    remember(command);
    if (!registered && acceptedTermsVersion === null) {
      void navigate(wizardPath(diagnosticId, 'consentimiento'), { replace: true });
      return;
    }

    const termsVersion = acceptedTermsVersion;
    let id = initiativeId;
    let acceptedNow = false;
    try {
      if (id === null) {
        if (termsVersion === null) return;
        const created = await createInitiative.mutateAsync(termsVersion);
        id = created.id;
        acceptedNow = true;
        setChoice(id);
        saveDraft({ initiativeId: id, command });
      } else if (!registered && chosen?.consentCurrent !== true) {
        if (termsVersion === null) return;
        await recordConsent.mutateAsync({ initiativeId: id, version: termsVersion });
        acceptedNow = true;
      }
      await register.mutateAsync({ initiativeId: id, ...command });
    } catch (error) {
      if (isApiErrorWithStatus(error, 409)) {
        clearAcceptance();
        notify.error(
          'El texto del consentimiento cambió mientras lo leías. Recarga la página para ver la versión vigente.',
        );
        void navigate(wizardPath(diagnosticId, 'consentimiento'), { replace: true });
        return;
      }
      const needsAcceptance = initiativeId === null || (!registered && chosen?.consentCurrent !== true);
      notify.error(
        acceptedNow
          ? `Tu aceptación quedó registrada, pero no fue posible guardar la iniciativa. ${RETRY_LATER}`
          : needsAcceptance
            ? `No fue posible registrar tu aceptación. ${RETRY_LATER}`
            : `No fue posible guardar la iniciativa. ${RETRY_LATER}`,
      );
      return;
    }

    clearDraft();
    notify.success(acceptedNow ? 'Consentimiento registrado.' : 'Iniciativa guardada.');
    void navigate(wizardPath(diagnosticId, 'cuestionario'));
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
        isSubmitting={busy}
        submitLabel="Continuar"
        onDraftChange={registered ? undefined : rememberForm}
        onSubmit={(command) => {
          void handleSubmit(command);
        }}
      />

      {!registered && (
        <div className="mt-6">
          <Link
            to={wizardPath(diagnosticId, 'consentimiento')}
            className={buttonVariants({ variant: 'ghost' })}
          >
            Atrás
          </Link>
        </div>
      )}
    </>
  );
}

import { useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Initiative, InitiativeSummary } from '@innlab/contracts';
import { ConsentTerms, useConsentTerms, useRecordConsent } from '@features/consent';
import {
  selectDraftClear,
  selectDraftSave,
  useCreateInitiative,
  useInitiativeDraftStore,
  useRegisterInitiative,
  type InitiativeDraft,
} from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { notify } from '@/shared/ui/notify';
import { Button, buttonVariants } from '@/shared/ui/button';
import { isApiErrorWithStatus } from '@/shared/api/http';
import { formatDateTime } from '@/shared/lib/format';
import { RETRY_LATER } from '@/shared/lib/copy';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  /** The profile already registered for this diagnostic, or `null`. */
  readonly registered: Initiative | null;
  /** Step 1's choice and form, still in the browser. */
  readonly draft: InitiativeDraft | null;
  readonly initiatives: readonly InitiativeSummary[];
}

type Failure = 'consent-stale' | 'consent' | 'initiative';

const MESSAGES: Record<Failure, string> = {
  'consent-stale':
    'El texto del consentimiento cambió mientras lo leías. Recarga la página para ver la versión vigente.',
  consent: `No fue posible registrar tu aceptación. ${RETRY_LATER}`,
  initiative: `Tu aceptación quedó registrada, pero no fue posible guardar la iniciativa. ${RETRY_LATER}`,
};

/**
 * Step 2 — consent to the processing of data (RF-03 / HU-05).
 *
 * The consent belongs to the initiative, and the text is the current one
 * the backend serves. Accepting does two things, in this order: it records
 * the acceptance — creating the initiative if step 1 chose a new one — and,
 * only then, registers the profile of step 1 (the system stores no data of
 * the initiative before the acceptance). If the second fails, the
 * acceptance is already recorded and the retry only repeats what is
 * missing: a new initiative's id is kept in the draft so it is not created
 * twice.
 */
export function ConsentStep({ diagnosticId, registered, draft, initiatives }: Props): JSX.Element {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const terms = useConsentTerms();
  const createInitiative = useCreateInitiative();
  const recordConsent = useRecordConsent();
  const register = useRegisterInitiative(diagnosticId);
  const saveDraft = useInitiativeDraftStore(selectDraftSave);
  const clearDraft = useInitiativeDraftStore(selectDraftClear);

  const initiativeId = draft ? draft.initiativeId : (registered?.initiativeId ?? null);
  const initiative = initiatives.find((i) => i.id === initiativeId);
  const acceptance = initiative?.consentCurrent ? initiative.consent : null;

  const busy = createInitiative.isPending || recordConsent.isPending || register.isPending;

  /** Records the acceptance; returns the initiative's id, or `null` if it failed. */
  async function accept(version: string): Promise<string | null> {
    try {
      if (initiativeId !== null) {
        await recordConsent.mutateAsync({ initiativeId, version });
        return initiativeId;
      }
      const created = await createInitiative.mutateAsync(version);
      if (draft) saveDraft({ initiativeId: created.id, command: draft.command });
      return created.id;
    } catch (error) {
      if (isApiErrorWithStatus(error, 409)) {
        void terms.refetch();
        notify.error(MESSAGES['consent-stale']);
      } else {
        notify.error(MESSAGES.consent);
      }
      return null;
    }
  }

  async function handleContinue(version: string): Promise<void> {
    if (!draft && !registered) {
      // The draft was lost: step 1 asks for it again.
      void navigate(wizardPath(diagnosticId, 'iniciativa'), { replace: true });
      return;
    }

    const id = acceptance ? initiativeId : await accept(version);
    if (id === null) return;

    if (draft) {
      try {
        await register.mutateAsync({ initiativeId: id, ...draft.command });
      } catch {
        notify.error(MESSAGES.initiative);
        return;
      }
    }

    clearDraft();
    if (!acceptance) notify.success('Consentimiento registrado.');
    void navigate(wizardPath(diagnosticId, 'cuestionario'));
  }

  const label = busy
    ? 'Guardando…'
    : acceptance
      ? draft
        ? 'Guardar iniciativa y continuar'
        : 'Continuar'
      : 'Aceptar y continuar';

  return (
    <>
      <PageHeader
        title="Consentimiento para el tratamiento de datos"
        description="Antes de guardar la información de tu iniciativa y tus respuestas necesitamos tu autorización, conforme a la Ley 1581 de 2012."
      />

      {terms.isPending && <LoadingState label="Cargando el texto del consentimiento…" />}

      {terms.isError && (
        <Alert tone="critical" title="No fue posible cargar el texto del consentimiento">
          {RETRY_LATER}
        </Alert>
      )}

      {terms.data && (
        <div className="flex flex-col gap-6">
          <ConsentTerms terms={terms.data} />

          {acceptance ? (
            <Alert tone="acceptable" title="Ya aceptaste este texto para esta iniciativa">
              Quedó registrado el {formatDateTime(acceptance.acceptedAt)}.
            </Alert>
          ) : (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => {
                  setAccepted(event.target.checked);
                }}
                className="mt-0.5 size-4 shrink-0 cursor-pointer"
              />
              <span className="text-foreground text-sm leading-relaxed">
                {terms.data.checkboxLabel}
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={wizardPath(diagnosticId, 'iniciativa')}
              className={buttonVariants({ variant: 'ghost' })}
            >
              Atrás
            </Link>
            <Button
              onClick={() => {
                void handleContinue(terms.data.version);
              }}
              disabled={busy || (!acceptance && !accepted)}
            >
              {label}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

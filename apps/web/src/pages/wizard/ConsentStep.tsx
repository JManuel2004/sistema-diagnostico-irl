import { useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ConsentRecord, Initiative, RegisterInitiativeCommand } from '@innlab/contracts';
import { CONSENT_CHECKBOX_LABEL, ConsentTerms, useRecordConsent } from '@features/consent';
import {
  selectDraftClear,
  useInitiativeDraftStore,
  useRegisterInitiative,
} from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { notify } from '@/shared/ui/notify';
import { Button, buttonVariants } from '@/shared/ui/button';
import { isApiErrorWithStatus } from '@/shared/api/http';
import { formatDateTime } from '@/shared/lib/format';
import { RETRY_LATER } from '@/shared/lib/copy';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  readonly consent: ConsentRecord | null;
  readonly initiative: Initiative | null;
  /** The form of step 1, still in the browser. */
  readonly draft: RegisterInitiativeCommand | null;
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
 * Accepting does two things, in this order: it records the consent and,
 * only then, registers the initiative of step 1 (the system stores no data
 * of the initiative before the acceptance). If the second fails, the
 * acceptance is already recorded and the retry only repeats what is
 * missing.
 */
export function ConsentStep({ diagnosticId, consent, initiative, draft }: Props): JSX.Element {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const recordConsent = useRecordConsent(diagnosticId);
  const register = useRegisterInitiative(diagnosticId);
  const clearDraft = useInitiativeDraftStore(selectDraftClear);

  const busy = recordConsent.isPending || register.isPending;
  const alreadyAccepted = consent !== null;
  const needsInitiative = initiative === null;

  async function handleContinue(): Promise<void> {
    if (!alreadyAccepted) {
      try {
        await recordConsent.mutateAsync();
      } catch (error) {
        notify.error(MESSAGES[isApiErrorWithStatus(error, 409) ? 'consent-stale' : 'consent']);
        return;
      }
    }

    if (needsInitiative) {
      if (!draft) {
        // The draft was lost: step 1 asks for it again.
        void navigate(wizardPath(diagnosticId, 'iniciativa'), { replace: true });
        return;
      }
      try {
        await register.mutateAsync(draft);
      } catch {
        notify.error(MESSAGES.initiative);
        return;
      }
    }

    clearDraft();
    if (!alreadyAccepted) notify.success('Consentimiento registrado.');
    void navigate(wizardPath(diagnosticId, 'cuestionario'));
  }

  const label = busy
    ? 'Guardando…'
    : alreadyAccepted
      ? needsInitiative
        ? 'Guardar iniciativa y continuar'
        : 'Continuar'
      : 'Aceptar y continuar';

  return (
    <>
      <PageHeader
        title="Consentimiento para el tratamiento de datos"
        description="Antes de guardar la información de tu iniciativa y tus respuestas necesitamos tu autorización, conforme a la Ley 1581 de 2012."
      />

      <div className="flex flex-col gap-6">
        <ConsentTerms />

        {alreadyAccepted ? (
          <Alert tone="acceptable" title="Ya aceptaste este texto">
            Quedó registrado el {formatDateTime(consent.acceptedAt)}.
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
              {CONSENT_CHECKBOX_LABEL}
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
              void handleContinue();
            }}
            disabled={busy || (!alreadyAccepted && !accepted)}
          >
            {label}
          </Button>
        </div>
      </div>
    </>
  );
}

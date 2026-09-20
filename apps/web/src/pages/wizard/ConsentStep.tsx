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
import { Button, buttonVariants } from '@/shared/ui/button';
import { ApiError } from '@/shared/api/http';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  readonly consent: ConsentRecord | null;
  readonly initiative: Initiative | null;
  /** El formulario del paso 1, todavía en el navegador. */
  readonly draft: RegisterInitiativeCommand | null;
}

type Failure = 'consent-stale' | 'consent' | 'initiative' | null;

const MESSAGES: Record<Exclude<Failure, null>, string> = {
  'consent-stale':
    'El texto del consentimiento cambió mientras lo leías. Recarga la página para ver la versión vigente.',
  consent: 'No fue posible registrar tu aceptación. Intenta de nuevo en unos minutos.',
  initiative:
    'Tu aceptación quedó registrada, pero no fue posible guardar la iniciativa. Intenta de nuevo en unos minutos.',
};

/**
 * Paso 2 — consentimiento para el tratamiento de datos (RF-03 / HU-05).
 *
 * Aceptar hace dos cosas, en este orden: registra el consentimiento y, solo
 * entonces, registra la iniciativa del paso 1 (el sistema no guarda datos de la
 * iniciativa antes de la aceptación). Si lo segundo falla, la aceptación ya
 * quedó registrada y el reintento solo repite lo que falta.
 */
export function ConsentStep({ diagnosticId, consent, initiative, draft }: Props): JSX.Element {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const recordConsent = useRecordConsent(diagnosticId);
  const register = useRegisterInitiative(diagnosticId);
  const clearDraft = useInitiativeDraftStore(selectDraftClear);

  const busy = recordConsent.isPending || register.isPending;
  const alreadyAccepted = consent !== null;
  const needsInitiative = initiative === null;

  async function handleContinue(): Promise<void> {
    setFailure(null);

    if (!alreadyAccepted) {
      try {
        await recordConsent.mutateAsync();
      } catch (error) {
        setFailure(error instanceof ApiError && error.status === 409 ? 'consent-stale' : 'consent');
        return;
      }
    }

    if (needsInitiative) {
      if (!draft) {
        // El borrador se perdió: el paso 1 vuelve a pedirlo.
        void navigate(wizardPath(diagnosticId, 'iniciativa'), { replace: true });
        return;
      }
      try {
        await register.mutateAsync(draft);
      } catch {
        setFailure('initiative');
        return;
      }
    }

    clearDraft();
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
        overline="Paso 2 de 3"
        title="Consentimiento para el tratamiento de datos"
        description="Antes de guardar la información de tu iniciativa y tus respuestas necesitamos tu autorización, conforme a la Ley 1581 de 2012."
      />

      <div className="flex flex-col gap-6">
        <ConsentTerms />

        {alreadyAccepted ? (
          <Alert tone="acceptable" title="Ya aceptaste este texto">
            Quedó registrado el{' '}
            {new Date(consent.acceptedAt).toLocaleString('es-CO', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
            .
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
            <span className="text-foreground text-sm leading-relaxed">{CONSENT_CHECKBOX_LABEL}</span>
          </label>
        )}

        {failure && <Alert tone="critical" title={MESSAGES[failure]} />}

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

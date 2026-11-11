import { useState, type JSX } from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Initiative, InitiativeSummary } from '@innlab/contracts';
import { ConsentTerms, useConsentTerms } from '@features/consent';
import { selectAcceptTerms, useInitiativeDraftStore } from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { Button, buttonVariants } from '@/shared/ui/button';
import { INNLAB_SUPPORT_URL, RETRY_LATER } from '@/shared/lib/copy';
import { formatDateTime } from '@/shared/lib/format';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  /** The profile already registered for this diagnostic, or `null`. */
  readonly registered: Initiative | null;
  /** The user's initiatives, to show an acceptance that is already on record. */
  readonly initiatives: readonly InitiativeSummary[];
  /** The text version accepted on this step, before an initiative is chosen. */
  readonly acceptedTermsVersion: string | null;
}

/**
 * Step 1 — consent to the processing of data (RF-03 / HU-05).
 *
 * This screen comes before any question about the initiative. Accepting
 * records the text version in the browser and opens the initiative form.
 * The acceptance is stored on the server only when that form continues,
 * because the consent belongs to the initiative and the user has not chosen
 * one yet. An initiative that is already registered already has its consent.
 * Under the text, a link to INNLAB's support channels for whoever has a
 * question about the processing of their data (usability test P05).
 */
export function ConsentStep({
  diagnosticId,
  registered,
  initiatives,
  acceptedTermsVersion,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const terms = useConsentTerms();
  const acceptTerms = useInitiativeDraftStore(selectAcceptTerms);

  const recorded =
    (registered
      ? initiatives.find((initiative) => initiative.id === registered.initiativeId)?.consent
      : null) ?? null;
  const acceptedThisText = acceptedTermsVersion === terms.data?.version;
  const alreadyAccepted = recorded !== null || acceptedThisText;

  function continueToInitiative(version: string): void {
    acceptTerms(version);
    void navigate(wizardPath(diagnosticId, 'iniciativa'));
  }

  return (
    <>
      <PageHeader
        title="Consentimiento para el tratamiento de datos"
        description="Antes de pedirte información de tu iniciativa y tus respuestas necesitamos tu autorización, conforme a la Ley 1581 de 2012."
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

          <div className="border-border bg-surface-muted rounded-control flex flex-col gap-3 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm leading-relaxed">
              ¿Tienes dudas sobre el tratamiento de tus datos? Escríbele a INNLAB por sus canales de
              atención.
            </p>
            <a
              href={INNLAB_SUPPORT_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Canales de atención de INNLAB
              <ExternalLink className="ml-1.5 size-4" aria-hidden="true" />
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </div>

          {alreadyAccepted ? (
            <Alert tone="acceptable" title="Ya aceptaste este texto">
              {recorded
                ? `Quedó registrado el ${formatDateTime(recorded.acceptedAt)}.`
                : 'Puedes continuar y contarnos de tu iniciativa.'}
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

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              onClick={() => {
                if (registered) {
                  void navigate(wizardPath(diagnosticId, 'cuestionario'));
                  return;
                }
                continueToInitiative(terms.data.version);
              }}
              disabled={!alreadyAccepted && !accepted}
            >
              {alreadyAccepted ? 'Continuar' : 'Aceptar y continuar'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

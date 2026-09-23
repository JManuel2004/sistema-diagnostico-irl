import { useEffect, type JSX } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { LogoutButton } from '@features/auth';
import { useConsent } from '@features/consent';
import {
  selectDraftCommand,
  selectDraftDiagnosticId,
  selectDraftInitialize,
  useInitiative,
  useInitiativeDraftStore,
} from '@features/initiative';
import {
  selectDraftDiagnosticId as selectQuestionnaireDiagnosticId,
  selectInitialize as selectQuestionnaireInitialize,
  useQuestionnaireDraftStore,
} from '@features/questionnaire';
import { PageShell } from '@/shared/ui/page-shell';
import { WizardStepper } from '@/shared/ui/wizard-stepper';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { useDiagnostic } from '@/shared/hooks/useDiagnostics';
import { InitiativeStep } from './wizard/InitiativeStep';
import { ConsentStep } from './wizard/ConsentStep';
import { QuestionnaireStep } from './wizard/QuestionnaireStep';
import { SummaryStep } from './wizard/SummaryStep';
import {
  WIZARD_STEP_KEYS,
  WIZARD_STEP_LABELS,
  firstPendingStep,
  isReachable,
  isWizardStep,
  wizardPath,
} from './wizard/wizard-steps';

/**
 * `/diagnosticos/:id/asistente/:step` — the wizard of a diagnostic.
 *
 * Four steps — initiative, consent, questionnaire and summary — in a single
 * screen **without main navigation**: the user goes through the wizard and
 * only at the end reaches the results, which is where navigation appears.
 *
 * Which step applies is decided by what the server already has (the
 * initiative, the consent) and not by a local flag: resuming a diagnostic
 * lands on the first missing step, and a later one cannot be skipped to. If
 * the diagnostic already has results, there is nothing to resume and they
 * open instead.
 */
export default function DiagnosticWizardPage(): JSX.Element {
  const { id: diagnosticId, step } = useParams<{ id: string; step: string }>();

  const diagnostic = useDiagnostic(diagnosticId);
  const consent = useConsent(diagnosticId);
  const initiative = useInitiative(diagnosticId);

  // Browser drafts belong to one diagnostic; another one's does not count.
  const initializeInitiativeDraft = useInitiativeDraftStore(selectDraftInitialize);
  const initiativeDraftOwner = useInitiativeDraftStore(selectDraftDiagnosticId);
  const initiativeDraft = useInitiativeDraftStore(selectDraftCommand);
  const initializeQuestionnaireDraft = useQuestionnaireDraftStore(selectQuestionnaireInitialize);
  const questionnaireDraftOwner = useQuestionnaireDraftStore(selectQuestionnaireDiagnosticId);

  useEffect(() => {
    initializeInitiativeDraft(diagnosticId ?? null);
    initializeQuestionnaireDraft(diagnosticId ?? null);
  }, [diagnosticId, initializeInitiativeDraft, initializeQuestionnaireDraft]);

  // Each step starts at the top: pressing «Continuar» at the bottom of a
  // long one must not open the next halfway down.
  useEffect(() => {
    if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0 });
  }, [step]);

  if (!diagnosticId) return <Navigate to="/" replace />;

  const pending = diagnostic.isPending || consent.isPending || initiative.isPending;
  const failed = diagnostic.isError || consent.isError || initiative.isError;
  const draftsReady =
    initiativeDraftOwner === diagnosticId && questionnaireDraftOwner === diagnosticId;

  if (diagnostic.data?.completed) {
    return <Navigate to={`/diagnosticos/${diagnosticId}/resultados`} replace />;
  }

  if (!pending && !failed && diagnostic.data && draftsReady) {
    const draft = initiativeDraft;
    const registered = initiative.data ?? null;
    const consentRecord = consent.data ?? null;

    const target = firstPendingStep({
      initiativeReady: registered !== null || draft !== null,
      consentDone: consentRecord !== null && registered !== null,
    });

    if (!isWizardStep(step) || !isReachable(step, target)) {
      return <Navigate to={wizardPath(diagnosticId, target)} replace />;
    }

    return (
      <PageShell
        width={step === 'consentimiento' ? 'reading' : 'standard'}
        showAttribution
        headerActions={<LogoutButton />}
      >
        <WizardStepper
          className="mb-8"
          currentKey={step}
          steps={WIZARD_STEP_KEYS.map((key) => ({
            key,
            label: WIZARD_STEP_LABELS[key],
            to: wizardPath(diagnosticId, key),
          }))}
        />

        {step === 'iniciativa' && (
          <InitiativeStep
            diagnosticId={diagnosticId}
            registered={registered}
            draft={draft}
            consentRecorded={consentRecord !== null}
          />
        )}
        {step === 'consentimiento' && (
          <ConsentStep
            diagnosticId={diagnosticId}
            consent={consentRecord}
            initiative={registered}
            draft={draft}
          />
        )}
        {step === 'cuestionario' && <QuestionnaireStep diagnosticId={diagnosticId} />}
        {step === 'resumen' && <SummaryStep diagnosticId={diagnosticId} />}
      </PageShell>
    );
  }

  return (
    <PageShell width="reading" showAttribution headerActions={<LogoutButton />}>
      {failed ? (
        <Alert tone="critical" title="No fue posible abrir tu diagnóstico">
          Intenta de nuevo en unos minutos.
        </Alert>
      ) : (
        <LoadingState label="Cargando tu diagnóstico…" />
      )}
    </PageShell>
  );
}

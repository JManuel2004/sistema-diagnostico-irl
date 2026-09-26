import { useEffect, type JSX } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { UserMenu } from '@features/auth';
import {
  selectDraft,
  selectDraftDiagnosticId,
  selectDraftInitialize,
  useInitiative,
  useInitiativeDraftStore,
  useMyInitiatives,
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
import { paths } from '@/shared/lib/paths';
import { RETRY_LATER } from '@/shared/lib/copy';
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
 * initiative profile of the diagnostic, which is only registered once the
 * initiative's consent is accepted) and not by a local flag: resuming a diagnostic
 * lands on the first missing step, and a later one cannot be skipped to. If
 * the diagnostic already has results, there is nothing to resume and they
 * open instead.
 */
export default function DiagnosticWizardPage(): JSX.Element {
  const { id: diagnosticId, step } = useParams<{ id: string; step: string }>();

  const diagnostic = useDiagnostic(diagnosticId);
  const initiative = useInitiative(diagnosticId);
  const initiatives = useMyInitiatives();

  // Browser drafts belong to one diagnostic; another one's does not count.
  const initializeInitiativeDraft = useInitiativeDraftStore(selectDraftInitialize);
  const initiativeDraftOwner = useInitiativeDraftStore(selectDraftDiagnosticId);
  const initiativeDraft = useInitiativeDraftStore(selectDraft);
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

  if (!diagnosticId) return <Navigate to={paths.landing} replace />;

  const pending = diagnostic.isPending || initiative.isPending || initiatives.isPending;
  const failed = diagnostic.isError || initiative.isError || initiatives.isError;
  const draftsReady =
    initiativeDraftOwner === diagnosticId && questionnaireDraftOwner === diagnosticId;

  if (diagnostic.data?.completed) {
    return <Navigate to={paths.results(diagnosticId)} replace />;
  }

  if (!pending && !failed && diagnostic.data && initiatives.data && draftsReady) {
    const draft = initiativeDraft;
    const registered = initiative.data ?? null;
    const frameworkVersion = diagnostic.data.frameworkVersion;

    const target = firstPendingStep({
      initiativeReady: registered !== null || draft !== null,
      consentDone: registered !== null,
    });

    if (!isWizardStep(step) || !isReachable(step, target)) {
      return <Navigate to={wizardPath(diagnosticId, target)} replace />;
    }

    return (
      <PageShell
        width={step === 'consentimiento' ? 'reading' : 'standard'}
        showAttribution
        headerActions={<UserMenu />}
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
            initiatives={initiatives.data}
          />
        )}
        {step === 'consentimiento' && (
          <ConsentStep
            diagnosticId={diagnosticId}
            registered={registered}
            draft={draft}
            initiatives={initiatives.data}
          />
        )}
        {step === 'cuestionario' && (
          <QuestionnaireStep diagnosticId={diagnosticId} frameworkVersion={frameworkVersion} />
        )}
        {step === 'resumen' && (
          <SummaryStep diagnosticId={diagnosticId} frameworkVersion={frameworkVersion} />
        )}
      </PageShell>
    );
  }

  return (
    <PageShell width="reading" showAttribution headerActions={<UserMenu />}>
      {failed ? (
        <Alert tone="critical" title="No fue posible abrir tu diagnóstico">
          {RETRY_LATER}
        </Alert>
      ) : (
        <LoadingState label="Cargando tu diagnóstico…" />
      )}
    </PageShell>
  );
}

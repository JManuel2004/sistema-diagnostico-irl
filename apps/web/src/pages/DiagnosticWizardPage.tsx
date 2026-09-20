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
 * `/diagnosticos/:id/asistente/:paso` — el asistente de un diagnóstico.
 *
 * Cuatro pasos —iniciativa, consentimiento, cuestionario y resumen— en una sola
 * pantalla **sin navegación principal**: el usuario recorre el asistente y solo
 * al terminar llega a los resultados, que es donde aparece la navegación.
 *
 * Qué paso toca lo decide lo que el servidor ya tiene (la iniciativa, el
 * consentimiento) y no una bandera local: al reanudar un diagnóstico se llega
 * al primer paso que falta, y no se puede saltar a uno posterior. Si el
 * diagnóstico ya tiene resultados, no hay nada que reanudar y se abren éstos.
 */
export default function DiagnosticWizardPage(): JSX.Element {
  const { id: diagnosticId, paso } = useParams<{ id: string; paso: string }>();

  const diagnostic = useDiagnostic(diagnosticId);
  const consent = useConsent(diagnosticId);
  const initiative = useInitiative(diagnosticId);

  // Los borradores del navegador son de un diagnóstico; el de otro no cuenta.
  const initializeInitiativeDraft = useInitiativeDraftStore(selectDraftInitialize);
  const initiativeDraftOwner = useInitiativeDraftStore(selectDraftDiagnosticId);
  const initiativeDraft = useInitiativeDraftStore(selectDraftCommand);
  const initializeQuestionnaireDraft = useQuestionnaireDraftStore(selectQuestionnaireInitialize);
  const questionnaireDraftOwner = useQuestionnaireDraftStore(selectQuestionnaireDiagnosticId);

  useEffect(() => {
    initializeInitiativeDraft(diagnosticId ?? null);
    initializeQuestionnaireDraft(diagnosticId ?? null);
  }, [diagnosticId, initializeInitiativeDraft, initializeQuestionnaireDraft]);

  // Cada paso empieza arriba: al pulsar «Continuar» al pie de uno largo, el
  // siguiente no debe abrirse a media altura.
  useEffect(() => {
    if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0 });
  }, [paso]);

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

    if (!isWizardStep(paso) || !isReachable(paso, target)) {
      return <Navigate to={wizardPath(diagnosticId, target)} replace />;
    }

    return (
      <PageShell
        width={paso === 'cuestionario' || paso === 'resumen' ? 'standard' : 'reading'}
        showAttribution
        headerActions={<LogoutButton />}
      >
        <WizardStepper
          className="mb-8"
          currentKey={paso}
          steps={WIZARD_STEP_KEYS.map((key) => ({
            key,
            label: WIZARD_STEP_LABELS[key],
            to: wizardPath(diagnosticId, key),
          }))}
        />

        {paso === 'iniciativa' && (
          <InitiativeStep
            diagnosticId={diagnosticId}
            registered={registered}
            draft={draft}
            consentRecorded={consentRecord !== null}
          />
        )}
        {paso === 'consentimiento' && (
          <ConsentStep
            diagnosticId={diagnosticId}
            consent={consentRecord}
            initiative={registered}
            draft={draft}
          />
        )}
        {paso === 'cuestionario' && <QuestionnaireStep diagnosticId={diagnosticId} />}
        {paso === 'resumen' && <SummaryStep diagnosticId={diagnosticId} />}
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

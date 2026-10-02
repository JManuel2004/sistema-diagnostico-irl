import type { JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AnswersSummary,
  selectAnswers,
  selectClearDraft,
  selectJustifications,
  useQuestionnaireCompletion,
  useQuestionnaireDraftStore,
} from '@features/questionnaire';
import { InitiativeSummary, useInitiative } from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { LoadingState } from '@/shared/ui/loading-state';
import { ProcessingState } from '@/shared/ui/processing-state';
import { notify } from '@/shared/ui/notify';
import { useFinalizeDiagnostic } from '@/shared/hooks/useFinalizeDiagnostic';
import { RETRY_LATER } from '@/shared/lib/copy';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  /** The IRL framework version the diagnostic is answered with. */
  readonly frameworkVersion: string;
}

/**
 * Summary of everything that is about to be processed: the initiative
 * (with the option to correct it) and the answers, with the justification
 * of each.
 *
 * «Procesar diagnóstico» is what sends the questionnaire to the server
 * (with each answer's justification) and computes the profile; when done
 * the results open and the browser draft is emptied. If the draft is not
 * complete the user goes back to the questionnaire: this step cannot be
 * reached with missing answers.
 */
export function SummaryStep({ diagnosticId, frameworkVersion }: Props): JSX.Element {
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const justifications = useQuestionnaireDraftStore(selectJustifications);
  const clearDraft = useQuestionnaireDraftStore(selectClearDraft);
  const { catalog, isComplete } = useQuestionnaireCompletion(frameworkVersion);
  const initiative = useInitiative(diagnosticId);

  const process = useFinalizeDiagnostic(diagnosticId);

  if (!catalog) return <LoadingState label="Cargando tus respuestas…" />;
  // Once processed, the draft is emptied while the results open: that empty
  // draft must not send the user back to the questionnaire.
  if (process.isPending || process.isSuccess) {
    return (
      <ProcessingState
        overline="Diagnóstico"
        title={process.isSuccess ? 'Abriendo tus resultados' : 'Estamos armando tu perfil'}
        description={
          process.isSuccess
            ? 'Tu perfil ya está listo. Te llevamos a verlo.'
            : 'Estamos convirtiendo tus 48 respuestas en el nivel de cada área. En un momento verás el resultado.'
        }
      />
    );
  }
  if (!isComplete) return <Navigate to={wizardPath(diagnosticId, 'cuestionario')} replace />;

  return (
    <>
      <PageHeader
        title="Revisa lo que vamos a procesar"
        description="Esta es tu iniciativa y tus 48 respuestas con la justificación de cada una. Al procesar el diagnóstico se envían y se calcula tu perfil de madurez; si quieres cambiar algo, vuelve al paso correspondiente."
      />

      <div className="flex flex-col gap-10">
        <section aria-labelledby="summary-initiative">
          <h2 id="summary-initiative" className="sr-only">
            Tu iniciativa
          </h2>
          {initiative.isPending && <LoadingState label="Cargando tu iniciativa…" />}
          {initiative.isError && (
            <Alert tone="critical" title="No fue posible cargar tu iniciativa">
              Puedes procesar el diagnóstico igualmente; la verás en tu panel.
            </Alert>
          )}
          {initiative.data && (
            <InitiativeSummary
              initiative={initiative.data}
              action={
                <Link
                  to={wizardPath(diagnosticId, 'iniciativa')}
                  className={buttonVariants({ variant: 'secondary' })}
                >
                  Corregir iniciativa
                </Link>
              }
            />
          )}
        </section>

        <section aria-labelledby="summary-answers">
          <h2 id="summary-answers" className="text-foreground mb-4 text-2xl font-bold">
            Tus respuestas
          </h2>
          <AnswersSummary dimensions={catalog.dimensions} />
        </section>
      </div>

      <div className="border-border mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Link
          to={wizardPath(diagnosticId, 'cuestionario')}
          className={buttonVariants({ variant: 'ghost' })}
        >
          Volver al cuestionario
        </Link>
        <Button
          onClick={() => {
            process.mutate(
              Object.entries(answers).map(([statementId, value]) => ({
                statementId,
                value,
                justification: (justifications[statementId] ?? '').trim(),
              })),
              {
                onSuccess: () => {
                  // The answers are saved on the server: the browser copy is
                  // no longer needed (the results are already open).
                  clearDraft();
                  notify.success('Diagnóstico procesado.');
                },
                onError: () => {
                  notify.error(`No fue posible generar el diagnóstico. ${RETRY_LATER}`);
                },
              },
            );
          }}
        >
          Procesar diagnóstico
        </Button>
      </div>
    </>
  );
}

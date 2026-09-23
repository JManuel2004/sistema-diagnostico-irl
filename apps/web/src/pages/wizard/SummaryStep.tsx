import type { JSX } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AnswersSummary,
  selectAnswers,
  selectJustifications,
  useQuestionnaireCompletion,
  useQuestionnaireDraftStore,
} from '@features/questionnaire';
import { InitiativeSummary, useInitiative } from '@features/initiative';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { LoadingState } from '@/shared/ui/loading-state';
import { queryKeys } from '@/shared/api/query-keys';
import { finalizeInitialDiagnostic } from '@/shared/api/diagnostic.api';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
}

/**
 * Summary of everything that is about to be processed: the initiative
 * (with the option to correct it) and the answers, with the justification
 * of each.
 *
 * «Procesar diagnóstico» is what sends the questionnaire to the server
 * (with each answer's justification) and computes the profile; when done
 * the results open. If the draft is not complete the user goes back to the
 * questionnaire: this step cannot be reached with missing answers.
 */
export function SummaryStep({ diagnosticId }: Props): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const justifications = useQuestionnaireDraftStore(selectJustifications);
  const { catalog, isComplete } = useQuestionnaireCompletion();
  const initiative = useInitiative(diagnosticId);

  const process = useMutation({
    mutationFn: () =>
      finalizeInitialDiagnostic(
        diagnosticId,
        Object.entries(answers).map(([statementId, value]) => ({
          statementId,
          value,
          justification: (justifications[statementId] ?? '').trim(),
        })),
      ),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.diagnostic.profile(diagnosticId), profile);
      // Waits for the refetch: the results screen decides from `completed`,
      // and with the old datum it would send the user back here.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.detail(diagnosticId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list }),
      ]);
      void navigate(`/diagnosticos/${diagnosticId}/resultados`, { replace: true });
    },
  });

  if (!catalog) return <LoadingState label="Cargando tus respuestas…" />;
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

      {process.isError && (
        <Alert
          tone="critical"
          className="mt-6"
          title="No fue posible generar el diagnóstico. Intenta de nuevo en unos minutos."
        />
      )}

      <div className="border-border mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Link
          to={wizardPath(diagnosticId, 'cuestionario')}
          className={buttonVariants({ variant: 'ghost' })}
        >
          Volver al cuestionario
        </Link>
        <Button
          onClick={() => {
            process.mutate();
          }}
          disabled={process.isPending}
        >
          {process.isPending ? 'Procesando…' : 'Procesar diagnóstico'}
        </Button>
      </div>
    </>
  );
}

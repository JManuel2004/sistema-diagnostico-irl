import { useState, useEffect, type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { QuestionnaireView } from '@features/questionnaire';
import {
  selectInitialize,
  selectAnswers,
  useQuestionnaireDraftStore,
} from '@features/questionnaire/store/questionnaire-draft.store';
import { useQuestionnaireStructure } from '@features/questionnaire/hooks/useQuestionnaireStructure';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { http } from '@/shared/api/http';
import type { SubmitQuestionnaireResponse } from '@innlab/contracts';

const STATEMENTS_PER_DIM = 8;

/**
 * Shell de la página `/diagnosticos/:id/cuestionario` (HU-07 / HU-09 / RF-06).
 *
 * Añade sobre el `QuestionnaireView` del compañero:
 *  - Botón "Procesar diagnóstico" que bloquea el envío si faltan respuestas (RF-06).
 *  - Al intentar enviar incompleto: banner que lista las dimensiones pendientes
 *    (complementa los indicadores X/8 ya visibles en las pestañas).
 *  - Al completar con éxito: pantalla de confirmación.
 */
export default function QuestionnairePage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const initialize = useQuestionnaireDraftStore(selectInitialize);
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const { data: catalog } = useQuestionnaireStructure();

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverResult, setServerResult] = useState<SubmitQuestionnaireResponse | null>(null);

  useEffect(() => {
    initialize(diagnosticId ?? null);
  }, [diagnosticId, initialize]);

  const incompleteDimensions =
    catalog?.dimensions.filter(
      (dim) =>
        dim.statements.filter((s) => answers[s.id] !== undefined).length < STATEMENTS_PER_DIM,
    ) ?? [];

  const isComplete = catalog !== undefined && incompleteDimensions.length === 0;

  const mutation = useMutation({
    mutationFn: (items: Array<{ statementId: string; value: number }>) =>
      http
        .post<SubmitQuestionnaireResponse>(`/diagnosticos/${diagnosticId ?? ''}/cuestionario`, {
          answers: items,
        })
        .then((r) => r.data),
    onSuccess: (data) => setServerResult(data),
  });

  function handleSubmit() {
    setSubmitAttempted(true);
    if (!isComplete) return;
    const items = Object.entries(answers).map(([statementId, value]) => ({
      statementId,
      value: value as number,
    }));
    mutation.mutate(items);
  }

  if (serverResult) {
    return (
      <PageShell width="standard" showAttribution>
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="border-acceptable/30 bg-acceptable-bg rounded-xl border p-8">
            <p className="text-acceptable text-5xl" aria-hidden="true">✓</p>
            <h2 className="text-foreground mt-4 text-2xl font-bold">
              Cuestionario enviado exitosamente
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Se registraron {serverResult.answersRecorded} de 48 respuestas.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="standard" showAttribution>
      <div className="mb-8">
        <p className="text-overline text-azul-icesi">
          Cuestionario IRL · KTH Innovation Readiness Level
        </p>
        <h1 className="tracking-tightest text-foreground mt-2 text-[2.25rem] font-bold leading-tight">
          Cuestionario IRL
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          Responde 8 afirmaciones por dimensión con la escala Likert de 1 a 5. Sé lo más objetivo
          posible; la honestidad en las respuestas garantiza un diagnóstico más preciso y útil.
        </p>
      </div>

      <QuestionnaireView />

      {/* RF-06: completeness validation section */}
      <div className="border-border mt-8 border-t pt-6">
        {submitAttempted && !isComplete && (
          <div
            role="alert"
            className="border-critical/30 bg-critical-bg mb-4 rounded-md border p-4"
          >
            <p className="text-critical font-semibold text-sm">
              Hay secciones sin completar. Responde todas las afirmaciones antes de continuar.
            </p>
            <ul className="text-critical mt-2 list-disc pl-5 text-sm">
              {incompleteDimensions.map((dim) => {
                const answered = dim.statements.filter(
                  (s) => answers[s.id] !== undefined,
                ).length;
                return (
                  <li key={dim.code}>
                    {dim.code} — {dim.name} ({answered}/{STATEMENTS_PER_DIM})
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {mutation.isError && (
          <div
            role="alert"
            className="border-critical/30 bg-critical-bg mb-4 rounded-md border p-4"
          >
            <p className="text-critical text-sm font-semibold">
              Error al comunicarse con el servidor. Intenta de nuevo.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs">
            {isComplete
              ? 'Todas las afirmaciones respondidas — listo para procesar.'
              : `Faltan respuestas en ${incompleteDimensions.length} dimensión(es).`}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Procesando...' : 'Procesar diagnóstico'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

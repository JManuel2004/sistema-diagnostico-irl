import { useState, useEffect, type JSX } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QuestionnaireView } from '@features/questionnaire';
import {
  selectInitialize,
  selectAnswers,
  useQuestionnaireDraftStore,
} from '@features/questionnaire/store/questionnaire-draft.store';
import { useQuestionnaireStructure } from '@features/questionnaire/hooks/useQuestionnaireStructure';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { queryKeys } from '@/shared/api/query-keys';
import { finalizeInitialDiagnostic } from '@/shared/api/diagnostic.api';

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
  const navigate = useNavigate();
  const initialize = useQuestionnaireDraftStore(selectInitialize);
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const { data: catalog } = useQuestionnaireStructure();

  /**
   * El aviso de incompletitud se muestra desde que el usuario intenta
   * enviar con respuestas faltantes y hasta que toca cualquier respuesta.
   *
   * Se deriva en vez de sincronizarse: guardamos la identidad del objeto
   * `answers` que había en el intento y la comparamos por referencia. El
   * store crea un objeto nuevo en cada `setAnswer`, así que esa comparación
   * es exactamente la señal "algo cambió desde entonces". Resetear un
   * booleano dentro de un `useEffect` sobre `answers` producía el mismo
   * efecto visible, pero a costa de un render extra y de un estado que
   * puede quedar desincronizado (regla `react-hooks/set-state-in-effect`).
   */
  const [attemptedWith, setAttemptedWith] = useState<object | null>(null);
  const submitAttempted = attemptedWith === answers;
  const queryClient = useQueryClient();

  useEffect(() => {
    initialize(diagnosticId ?? null);
  }, [diagnosticId, initialize]);

  const incompleteDimensions =
    catalog?.dimensions.filter(
      (dim) =>
        dim.statements.filter((s) => answers[s.id] !== undefined).length < STATEMENTS_PER_DIM,
    ) ?? [];

  const isComplete = catalog !== undefined && incompleteDimensions.length === 0;

  const submitAndCompute = useMutation({
    mutationFn: async (items: { statementId: string; value: number }[]) => {
      if (!diagnosticId) {
        throw new Error('Falta el identificador del diagnóstico');
      }
      return finalizeInitialDiagnostic(diagnosticId, items);
    },
    onSuccess: (profile) => {
      if (!diagnosticId) return;
      queryClient.setQueryData(queryKeys.diagnostic.profile(diagnosticId), profile);
      void navigate(`/diagnosticos/${diagnosticId}/perfil`);
    },
  });

  function handleSubmit(): void {
    setAttemptedWith(answers);
    if (!isComplete) return;
    const items = Object.entries(answers).map(([statementId, value]) => ({
      statementId,
      value: value,
    }));
    submitAndCompute.mutate(items);
  }

  const isProcessing = submitAndCompute.isPending;
  const hasError = submitAndCompute.isError;

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
            <p className="text-critical text-sm font-semibold">
              Hay secciones sin completar. Responde todas las afirmaciones antes de continuar.
            </p>
            <ul className="text-critical mt-2 list-disc pl-5 text-sm">
              {incompleteDimensions.map((dim) => {
                const answered = dim.statements.filter((s) => answers[s.id] !== undefined).length;
                return (
                  <li key={dim.code}>
                    {dim.code} — {dim.name} ({answered}/{STATEMENTS_PER_DIM})
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {hasError && (
          <div
            role="alert"
            className="border-critical/30 bg-critical-bg mb-4 rounded-md border p-4"
          >
            <p className="text-critical text-sm font-semibold">
              No fue posible generar el diagnóstico. Intenta de nuevo en unos minutos.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs">
            {isComplete
              ? 'Todas las afirmaciones respondidas — listo para procesar.'
              : `Faltan respuestas en ${incompleteDimensions.length} dimensión(es).`}
          </p>
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? 'Procesando…' : 'Procesar diagnóstico'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

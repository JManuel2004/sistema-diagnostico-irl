import { Suspense, useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QuestionnaireView, useQuestionnaireCompletion } from '@features/questionnaire';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { QuestionnaireAutofill } from '@/dev/dev-autofill';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
}

/**
 * Step 3 — the 48-statement questionnaire (HU-07 / HU-09 / RF-06).
 *
 * It blocks moving on to the summary if anything is missing (RF-06): each
 * statement needs **its answer and its justification**. Trying to move on
 * incomplete lists which dimensions are missing (on top of the tabs' X/8
 * indicators) and the warning stays until nothing is missing. Nothing is
 * sent to the server here: the draft lives in the browser until «Procesar
 * diagnóstico» (step 4).
 */
export function QuestionnaireStep({ diagnosticId }: Props): JSX.Element {
  const navigate = useNavigate();
  const { catalog, incompleteDimensions, completedIn, isComplete } = useQuestionnaireCompletion();

  /**
   * The warning appears once the user tries to move on with missing
   * answers and **stays while any is still missing**: the list is
   * recomputed with each answer and the warning disappears only when none
   * is left.
   */
  const [advanceAttempted, setAdvanceAttempted] = useState(false);

  function handleAdvance(): void {
    setAdvanceAttempted(true);
    if (!isComplete) return;
    void navigate(wizardPath(diagnosticId, 'resumen'));
  }

  return (
    <>
      <PageHeader
        title="Cuestionario IRL"
        description="Responde 8 afirmaciones por dimensión con la escala Likert de 1 a 5 y explica en cada una por qué elegiste ese nivel. Sé lo más objetivo posible; la honestidad en las respuestas garantiza un diagnóstico más preciso y útil."
      />

      {QuestionnaireAutofill && catalog && (
        <Suspense fallback={null}>
          <div className="mb-4">
            <QuestionnaireAutofill dimensions={catalog.dimensions} />
          </div>
        </Suspense>
      )}

      <QuestionnaireView />

      {/* RF-06: completeness validation section */}
      <div className="border-border mt-8 border-t pt-6">
        {advanceAttempted && !isComplete && (
          <Alert
            tone="critical"
            className="mb-4"
            title="Hay afirmaciones sin completar. Cada una necesita su respuesta y su justificación antes de continuar."
          >
            <ul className="list-disc pl-5">
              {incompleteDimensions.map((dim) => (
                <li key={dim.code}>
                  {dim.code} — {dim.name} ({completedIn(dim)}/{dim.statements.length})
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={wizardPath(diagnosticId, 'consentimiento')}
            className={buttonVariants({ variant: 'ghost' })}
          >
            Atrás
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-muted-foreground text-sm">
              {isComplete
                ? 'Todas las afirmaciones completas — listo para revisar.'
                : `Faltan respuestas o justificaciones en ${String(incompleteDimensions.length)} dimensión(es).`}
            </p>
            <Button size="lg" className="w-full sm:w-auto" onClick={handleAdvance}>
              Revisar resumen
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

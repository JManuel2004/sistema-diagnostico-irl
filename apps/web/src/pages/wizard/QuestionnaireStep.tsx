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
 * Paso 3 — el cuestionario de 48 afirmaciones (HU-07 / HU-09 / RF-06).
 *
 * Bloquea el avance al resumen si falta algo (RF-06): cada afirmación necesita
 * **su respuesta y su justificación**. Al intentar avanzar incompleto se lista
 * qué dimensiones faltan (complementa los indicadores X/8 de las pestañas) y el
 * aviso se mantiene hasta que no falte ninguna. Nada se envía al servidor aquí:
 * el borrador vive en el navegador hasta «Procesar diagnóstico» (paso 4).
 */
export function QuestionnaireStep({ diagnosticId }: Props): JSX.Element {
  const navigate = useNavigate();
  const { catalog, incompleteDimensions, completedIn, isComplete } = useQuestionnaireCompletion();

  /**
   * El aviso aparece desde que el usuario intenta avanzar con respuestas
   * faltantes y **permanece mientras siga faltando alguna** (backlog 10.5): la
   * lista se recalcula con cada respuesta y el aviso desaparece solo cuando ya
   * no queda ninguna.
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

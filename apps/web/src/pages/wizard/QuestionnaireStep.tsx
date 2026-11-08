import { Suspense, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import {
  DraftSaveStatus,
  QuestionnaireProgress,
  QuestionnaireView,
  selectAnswers,
  selectSetActiveTab,
  useQuestionnaireCompletion,
  useQuestionnaireDraftStore,
  type DraftSaveState,
} from '@features/questionnaire';
import { PageHeader } from '@/shared/ui/page-header';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { Button, buttonVariants } from '@/shared/ui/button';
import { QuestionnaireAutofill } from '@/dev/dev-autofill';
import { wizardPath } from './wizard-steps';

interface Props {
  readonly diagnosticId: string;
  /** The IRL framework version the diagnostic is answered with. */
  readonly frameworkVersion: string;
  /** Whether the answers are saved on the server. */
  readonly saveStatus: DraftSaveState;
}

/**
 * Step 3 — the 48-statement questionnaire (HU-07 / HU-09 / RF-06).
 *
 * It blocks moving on to the summary if anything is missing (RF-06): each
 * statement needs **its answer**; the justification is optional. While any
 * is missing there is no «Revisar resumen»: the footer says how many are
 * missing and in which dimensions, each one a button that opens it, and the
 * screen's primary button is «Continuar con…» at the end of each dimension
 * (usability tests P03, P05: the summary looked reachable halfway). With all
 * 48 answered, «Revisar resumen» appears as the primary action.
 *
 * Above the statements, a band that sticks while scrolling: the progress,
 * whether the answers are saved (P02) and, with everything answered, «Volver
 * al resumen» (P03: correcting one answer meant scrolling to the end). Before
 * the first answer, a notice says the questionnaire has started, how long it
 * is and that it saves itself (P03). The answers are saved on the server as a
 * draft while the user answers, so they can close the session and continue
 * later; they are processed only with «Procesar diagnóstico» (step 4).
 */
export function QuestionnaireStep({
  diagnosticId,
  frameworkVersion,
  saveStatus,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const { catalog, incompleteDimensions, completedIn, isComplete } =
    useQuestionnaireCompletion(frameworkVersion);
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const setActiveTab = useQuestionnaireDraftStore(selectSetActiveTab);

  const total = catalog?.dimensions.reduce((acc, d) => acc + d.statements.length, 0) ?? 48;
  const missing = incompleteDimensions.reduce(
    (acc, d) => acc + d.statements.length - completedIn(d),
    0,
  );
  const started = Object.keys(answers).length > 0;
  const toSummary = (): void => {
    void navigate(wizardPath(diagnosticId, 'resumen'));
  };

  return (
    <>
      <PageHeader
        title="Cuestionario IRL"
        fullWidthDescription
        description="Este paso mide qué tan madura está tu iniciativa en las seis dimensiones del marco IRL (Innovation Readiness Level) de KTH: tecnología, cliente, negocio, propiedad intelectual, equipo y financiación. Cada pestaña es una dimensión con afirmaciones sobre lo que tu iniciativa hace hoy: en cada una, elige qué tan de acuerdo estás con que la describe y, si quieres, cuenta por qué. Sé lo más objetivo posible; la honestidad en las respuestas garantiza un diagnóstico más preciso y útil."
      />

      {!started && (
        <section
          aria-labelledby="questionnaire-start"
          className="bg-azul-wash mb-6 flex items-start gap-4 rounded-2xl p-5 sm:p-6"
        >
          <ClipboardList className="text-azul-icesi mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <div>
            <h2 id="questionnaire-start" className="text-foreground text-lg font-bold">
              Empieza el cuestionario
            </h2>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              Son {total} afirmaciones, 8 por cada una de las 6 dimensiones. Tus respuestas se
              guardan solas: puedes salir y continuar después donde lo dejaste.
            </p>
          </div>
        </section>
      )}

      {QuestionnaireAutofill && catalog && (
        <Suspense fallback={null}>
          <div className="mb-4">
            <QuestionnaireAutofill dimensions={catalog.dimensions} />
          </div>
        </Suspense>
      )}

      {catalog ? (
        <QuestionnaireProgress
          dimensions={catalog.dimensions}
          status={<DraftSaveStatus status={saveStatus} />}
          action={
            isComplete ? (
              <Button size="sm" variant="secondary" onClick={toSummary}>
                Volver al resumen
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mb-4">
          <DraftSaveStatus status={saveStatus} />
        </div>
      )}

      <QuestionnaireView frameworkVersion={frameworkVersion} />

      {/* RF-06: the summary is offered only with every statement answered. */}
      <div className="border-border mt-8 border-t pt-6">
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link
            to={wizardPath(diagnosticId, 'iniciativa')}
            className={buttonVariants({ variant: 'ghost' })}
          >
            Atrás
          </Link>
          <div className="flex flex-col gap-3 sm:items-end">
            {isComplete && (
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={toSummary}
                aria-describedby="questionnaire-missing"
              >
                Revisar resumen
              </Button>
            )}
            <div
              id="questionnaire-missing"
              aria-live="polite"
              className="text-muted-foreground text-sm sm:text-right"
            >
              {!catalog ? null : isComplete ? (
                <p>Todas las afirmaciones están completas. Ya puedes revisar el resumen.</p>
              ) : (
                <>
                  <p>
                    {missing === 1
                      ? 'Falta 1 afirmación por responder. La justificación es opcional.'
                      : `Faltan ${String(missing)} afirmaciones por responder. La justificación es opcional.`}
                  </p>
                  <ul
                    aria-label="Dimensiones con afirmaciones pendientes"
                    className="mt-2 flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end"
                  >
                    {/* Short, so the six fit on one line: the full name is its label and tooltip. */}
                    {incompleteDimensions.map((dim) => {
                      const visual = getDimensionVisual(dim.code);
                      const progress = `${String(completedIn(dim))}/${String(dim.statements.length)}`;
                      return (
                        <li key={dim.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab(dim.code);
                            }}
                            title={dim.name}
                            aria-label={`${dim.code} — ${dim.name}: ${String(completedIn(dim))} de ${String(dim.statements.length)} respondidas`}
                            className="border-border text-foreground hover:border-primary rounded-control inline-flex items-center gap-1.5 whitespace-nowrap border px-2.5 py-1 text-sm font-semibold"
                          >
                            <visual.icon
                              className={`${visual.textInk} size-4 shrink-0`}
                              aria-hidden="true"
                            />
                            <span className={visual.textInk}>{dim.code}</span>
                            <span className="text-muted-foreground font-medium tabular-nums">
                              {progress}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

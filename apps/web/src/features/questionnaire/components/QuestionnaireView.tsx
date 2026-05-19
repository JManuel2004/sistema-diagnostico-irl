import { Button } from '@/shared/ui/button';
import { useQuestionnaireStructure } from '../hooks/useQuestionnaireStructure';
import { DimensionTabs } from './DimensionTabs';
import { QuestionnaireSkeleton } from './QuestionnaireSkeleton';

/**
 * Vista raíz del cuestionario IRL (HU-07).
 *
 * Estados:
 *  - Cargando: esqueleto con shimmer.
 *  - Error: alerta institucional con icono semántico (`critical-bg`)
 *    y CTA "Reintentar". Color nunca es la única señal — el icono
 *    `AlertCircle` y la etiqueta de texto van siempre juntos.
 *  - Éxito: tabs de las 6 dimensiones con sus 48 afirmaciones.
 */

function AlertIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function QuestionnaireView() {
  const { data, isLoading, isError, refetch } = useQuestionnaireStructure();

  if (isLoading) return <QuestionnaireSkeleton />;

  if (isError || !data) {
    return (
      <div role="alert" className="border-critical/30 bg-critical-bg rounded-md border p-6">
        <div className="flex items-start gap-3">
          <span className="text-critical mt-0.5">
            <AlertIcon />
          </span>
          <div className="flex-1">
            <p className="text-critical font-semibold">No pudimos cargar el cuestionario</p>
            <p className="text-foreground/80 mt-1 text-sm leading-relaxed">
              Verifica tu conexión e inténtalo de nuevo en unos segundos. Si el problema persiste,
              contacta a tu facilitador de INNLAB.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <DimensionTabs dimensions={data.dimensions} />;
}

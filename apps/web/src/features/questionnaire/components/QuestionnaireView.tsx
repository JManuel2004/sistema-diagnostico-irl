import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { useQuestionnaireStructure } from '../hooks/useQuestionnaireStructure';
import { DimensionTabs } from './DimensionTabs';
import { QuestionnaireSkeleton } from './QuestionnaireSkeleton';

/**
 * Vista raíz del cuestionario IRL (HU-07).
 *
 * Estados:
 *  - Cargando: esqueleto con shimmer.
 *  - Error: `Alert` crítica con su icono y CTA "Reintentar". Color nunca
 *    es la única señal — el icono y el texto van siempre juntos.
 *  - Éxito: tabs de las 6 dimensiones con sus 48 afirmaciones.
 */

export function QuestionnaireView() {
  const { data, isLoading, isError, refetch } = useQuestionnaireStructure();

  if (isLoading) return <QuestionnaireSkeleton />;

  if (isError || !data) {
    return (
      <Alert
        tone="critical"
        title="No pudimos cargar el cuestionario"
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void refetch();
            }}
          >
            Reintentar
          </Button>
        }
      >
        Verifica tu conexión e inténtalo de nuevo en unos segundos. Si el problema persiste,
        contacta a tu facilitador de INNLAB.
      </Alert>
    );
  }

  return <DimensionTabs dimensions={data.dimensions} />;
}

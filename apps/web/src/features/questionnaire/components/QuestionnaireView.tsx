import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { useQuestionnaireStructure } from '../hooks/useQuestionnaireStructure';
import { DimensionTabs } from './DimensionTabs';
import { QuestionnaireSkeleton } from './QuestionnaireSkeleton';

/**
 * Root view of the IRL questionnaire (HU-07).
 *
 * States:
 *  - Loading: skeleton with shimmer.
 *  - Error: a critical `Alert` with its icon and a "Reintentar" CTA. Color
 *    is never the only signal — icon and text always go together.
 *  - Success: tabs of the 6 dimensions with their 48 statements.
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

import { Button } from '@/shared/ui/button';
import { useQuestionnaireStructure } from '../hooks/useQuestionnaireStructure';
import { DimensionTabs } from './DimensionTabs';
import { QuestionnaireSkeleton } from './QuestionnaireSkeleton';

export function QuestionnaireView() {
  const { data, isLoading, isError, refetch } = useQuestionnaireStructure();

  if (isLoading) return <QuestionnaireSkeleton />;

  if (isError || !data) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 p-6 text-center">
        <p className="font-medium">No pudimos cargar el cuestionario</p>
        <p className="text-muted-foreground mt-1 text-sm">Intenta de nuevo en unos segundos.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            void refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return <DimensionTabs dimensions={data.dimensions} />;
}

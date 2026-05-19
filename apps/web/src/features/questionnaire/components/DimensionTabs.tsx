import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { DimensionPanel } from './DimensionPanel';

interface Props {
  dimensions: QuestionnaireStructure['dimensions'];
}

export function DimensionTabs({ dimensions }: Props) {
  const firstCode = dimensions[0]?.code ?? 'TRL';
  return (
    <Tabs defaultValue={firstCode} className="w-full">
      <TabsList aria-label="Dimensiones IRL" className="grid w-full grid-cols-6">
        {dimensions.map((d) => (
          <TabsTrigger key={d.code} value={d.code}>
            {d.code}
          </TabsTrigger>
        ))}
      </TabsList>
      {dimensions.map((d) => (
        <TabsContent key={d.code} value={d.code}>
          <DimensionPanel dimension={d} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

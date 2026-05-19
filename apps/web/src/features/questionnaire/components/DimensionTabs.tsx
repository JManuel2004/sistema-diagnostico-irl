import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { DimensionPanel } from './DimensionPanel';
import { useQuestionnaireDraftStore, selectAnswers } from '../store/questionnaire-draft.store';

/**
 * Tabs de dimensiones IRL.
 *
 * Layout (`DESIGN.md`):
 *  - Desktop: grid de 6 columnas (un trigger por dimensión).
 *  - Mobile: la lista cae a scroll horizontal — Tailwind `overflow-x-auto`
 *    sobre el wrapper conserva la altura y permite `scroll-snap` al
 *    deslizar.
 *
 * Códigos de dimensión (TRL, CRL, BRL, IPRL, TmRL, FRL) siempre en
 * `overline` (uppercase, 8% letter-spacing), nunca traducidos ni
 * abreviados según `DESIGN.md`.
 */

interface Props {
  dimensions: QuestionnaireStructure['dimensions'];
}

export function DimensionTabs({ dimensions }: Props) {
  const firstCode = dimensions[0]?.code ?? 'TRL';
  const answers = useQuestionnaireDraftStore(selectAnswers);

  return (
    <Tabs defaultValue={firstCode} className="w-full">
      <div className="overflow-x-auto">
        <TabsList
          aria-label="Dimensiones IRL"
          className="grid h-auto w-full min-w-max grid-cols-6 gap-1 p-1"
        >
          {dimensions.map((d) => {
            const answered = d.statements.filter((st) => answers[st.id] !== undefined).length;

            return (
              <TabsTrigger
                key={d.code}
                value={d.code}
                className="flex h-12 flex-col items-center justify-center gap-0.5 px-3 py-2"
                title={d.name}
              >
                <span className="text-overline">{d.code}</span>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-[0.6875rem] font-normal tracking-normal"
                >
                  {answered}/8
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {dimensions.map((d) => (
        <TabsContent key={d.code} value={d.code}>
          <DimensionPanel dimension={d} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

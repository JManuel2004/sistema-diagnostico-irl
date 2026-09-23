import { useState, type JSX } from 'react';
import type { DimensionCode, QuestionnaireStructure } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { cn } from '@/shared/lib/utils';
import { LevelBar } from '@/shared/ui/level-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  selectAnswers,
  selectJustifications,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';
import { likertText } from '../lib/likert-options';

/**
 * Summary of the answers before processing the diagnostic.
 *
 * One table per dimension with **Afirmación / Puntaje seleccionado /
 * Justificación**. The six dimensions are browsed through tabs, as in the
 * questionnaire, instead of stacking six tables. It is read-only: answers
 * are corrected by going back to the questionnaire.
 *
 * Each dimension carries its color — on the tab, the table header and the
 * score bar — so it is recognized as the same dimension seen in the
 * questionnaire.
 */
interface Props {
  readonly dimensions: QuestionnaireStructure['dimensions'];
}

export function AnswersSummary({ dimensions }: Props): JSX.Element {
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const justifications = useQuestionnaireDraftStore(selectJustifications);
  const [active, setActive] = useState<DimensionCode>(dimensions[0]?.code ?? 'TRL');

  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        setActive(value as DimensionCode);
      }}
      className="w-full"
    >
      <div className="overflow-x-auto">
        <TabsList
          aria-label="Dimensiones del resumen"
          className="grid h-auto w-full min-w-max grid-cols-6 gap-1"
        >
          {dimensions.map((d) => {
            const visual = getDimensionVisual(d.code);
            const Icon = visual.icon;
            return (
              <TabsTrigger
                key={d.code}
                value={d.code}
                title={d.name}
                className={cn('h-12 gap-2 border-b-4 border-transparent px-3', visual.tabActive)}
              >
                <Icon className={cn('size-4 shrink-0', visual.textInk)} aria-hidden="true" />
                <span className="text-overline">{d.code}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {dimensions.map((d) => {
        const visual = getDimensionVisual(d.code);
        const Icon = visual.icon;
        return (
          <TabsContent key={d.code} value={d.code}>
            <div
              className={cn(
                'border-border overflow-x-auto rounded-md border border-t-4',
                visual.border,
              )}
            >
              <div className={cn('flex items-center gap-3 px-4 py-3', visual.tint)}>
                <Icon className={cn('size-6 shrink-0', visual.textInk)} aria-hidden="true" />
                <p className={cn('text-lg font-bold', visual.textInk)}>{d.name}</p>
              </div>
              <table className="w-full min-w-[40rem] border-collapse text-left">
                <caption className="sr-only">Respuestas de {d.name}</caption>
                <thead>
                  <tr className="border-border border-b">
                    <th
                      scope="col"
                      className={cn('w-[34%] px-4 py-3 text-sm font-bold', visual.textInk)}
                    >
                      Afirmación
                    </th>
                    <th
                      scope="col"
                      className={cn('w-[24%] px-4 py-3 text-sm font-bold', visual.textInk)}
                    >
                      Puntaje seleccionado
                    </th>
                    <th scope="col" className={cn('px-4 py-3 text-sm font-bold', visual.textInk)}>
                      Justificación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.statements.map((statement, index) => {
                    const value = answers[statement.id];
                    return (
                      <tr
                        key={statement.id}
                        className={cn(
                          'border-border border-b align-top last:border-b-0',
                          index % 2 === 1 && visual.tint,
                        )}
                      >
                        <td className="text-foreground px-4 py-3 text-base leading-relaxed">
                          {statement.text}
                        </td>
                        <td className="px-4 py-3">
                          {value === undefined ? (
                            <span className="text-muted-foreground text-base">—</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="text-foreground text-base font-semibold">
                                {likertText(value)}
                              </span>
                              <LevelBar
                                level={value}
                                fillClass={visual.bg}
                                className="w-28"
                                segments={5}
                              />
                            </div>
                          )}
                        </td>
                        <td className="text-muted-foreground whitespace-pre-wrap px-4 py-3 text-base leading-relaxed">
                          {(justifications[statement.id] ?? '').trim() || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

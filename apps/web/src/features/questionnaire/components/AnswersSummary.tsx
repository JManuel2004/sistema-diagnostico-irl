import { useState, type JSX } from 'react';
import type { DimensionCode, QuestionnaireStructure } from '@innlab/contracts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { selectAnswers, selectJustifications, useQuestionnaireDraftStore } from '../store/questionnaire-draft.store';
import { likertText } from '../lib/likert-options';

/**
 * Resumen de las respuestas antes de procesar el diagnóstico.
 *
 * Una tabla por dimensión con **Afirmación / Puntaje seleccionado /
 * Justificación**. Las seis dimensiones se recorren por pestañas, como en el
 * cuestionario, y no se apilan las seis tablas. Es de solo lectura: se corrige
 * volviendo al cuestionario.
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
          className="grid h-auto w-full min-w-max grid-cols-6 gap-1 p-1"
        >
          {dimensions.map((d) => (
            <TabsTrigger key={d.code} value={d.code} className="h-10 px-3" title={d.name}>
              <span className="text-overline">{d.code}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {dimensions.map((d) => (
        <TabsContent key={d.code} value={d.code}>
          <div className="border-border overflow-x-auto rounded-md border">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <caption className="sr-only">Respuestas de {d.name}</caption>
              <thead className="bg-surface-muted">
                <tr className="border-border border-b">
                  <th scope="col" className="text-overline text-muted-foreground w-[34%] px-4 py-3">
                    Afirmación
                  </th>
                  <th scope="col" className="text-overline text-muted-foreground w-[22%] px-4 py-3">
                    Puntaje seleccionado
                  </th>
                  <th scope="col" className="text-overline text-muted-foreground px-4 py-3">
                    Justificación
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.statements.map((statement) => {
                  const value = answers[statement.id];
                  return (
                    <tr key={statement.id} className="border-border border-b align-top last:border-b-0">
                      <td className="text-foreground px-4 py-3 leading-relaxed">{statement.text}</td>
                      <td className="text-foreground px-4 py-3 font-medium">
                        {value === undefined ? '—' : likertText(value)}
                      </td>
                      <td className="text-muted-foreground whitespace-pre-wrap px-4 py-3 leading-relaxed">
                        {(justifications[statement.id] ?? '').trim() || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

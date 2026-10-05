import { useState, type JSX } from 'react';
import {
  LIKERT_LABELS,
  type DimensionAnswers,
  type DimensionCode,
  type GivenAnswer,
} from '@innlab/contracts';
import { LevelBar } from '@/shared/ui/level-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Tooltip } from '@/shared/ui/tooltip';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { formatOneDecimal } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

/**
 * What the user answered to each of the 48 statements (HU-23), read two
 * ways:
 *
 *  - **At a glance**, a 6 × 8 grid: one row per dimension, one cell per
 *    statement, shaded from light (1, totally disagree) to dark (5, totally
 *    agree) in a single hue, with the number written in every cell. A cell
 *    explains itself on hover or focus and, when clicked, opens its
 *    dimension below and marks the statement.
 *  - **In detail**, one tab per dimension: each statement with its answer as
 *    five segments, the words of the value and the justification.
 *
 * Nothing is computed here: the values, the names and the averages come in
 * the report.
 */
interface Props {
  readonly answers: readonly DimensionAnswers[];
  /** Short name and Likert average of each dimension, from the profile. */
  readonly dimensions: readonly {
    readonly code: DimensionCode;
    readonly shortName: string;
    readonly averageLikert: number;
  }[];
}

/** The shade of each value: one hue, light to dark (`PALETTE.likert`). */
const CELL: Readonly<Record<number, string>> = {
  1: 'bg-likert-1 text-foreground',
  2: 'bg-likert-2 text-foreground',
  3: 'bg-likert-3 text-white',
  4: 'bg-likert-4 text-white',
  5: 'bg-likert-5 text-white',
};

const VALUES = [1, 2, 3, 4, 5] as const;

function valueLabel(value: number): string {
  return LIKERT_LABELS[value] ?? String(value);
}

export function ReportAnswers({ answers, dimensions }: Props): JSX.Element {
  const first = answers[0]?.dimensionCode ?? 'TRL';
  const [tab, setTab] = useState<string>(first);
  const [selected, setSelected] = useState<string | null>(null);
  const meta = new Map(dimensions.map((d) => [d.code, d]));
  const shortName = (code: DimensionCode, fallback: string): string =>
    meta.get(code)?.shortName ?? fallback;

  const open = (dimension: DimensionCode, statementId: string): void => {
    setTab(dimension);
    setSelected(statementId);
    // Let the tab render before bringing the statement into view.
    requestAnimationFrame(() => {
      document
        .getElementById(`answer-${statementId}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <figure className="border-border border p-4 sm:p-6">
        <figcaption className="text-foreground text-base font-semibold">
          Tus 48 respuestas de un vistazo
        </figcaption>
        <p className="text-muted-foreground mt-1 text-sm">
          Cada fila es una dimensión y cada casilla una afirmación. Pasa el cursor para leerla o haz
          clic para verla con su justificación.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] sm:border-spacing-[3px]">
            <caption className="sr-only">
              Valor de cada respuesta, de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo),
              por dimensión y afirmación
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-px">
                  <span className="sr-only">Dimensión</span>
                </th>
                {Array.from({ length: 8 }, (_, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="text-muted-foreground pb-1 text-center text-sm font-semibold"
                  >
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answers.map((d) => {
                const name = shortName(d.dimensionCode, d.name);
                return (
                  <tr key={d.dimensionCode}>
                    <th scope="row" className="w-px pr-1 text-left font-normal sm:pr-3">
                      <RowLabel code={d.dimensionCode} name={name} />
                    </th>
                    {d.answers.map((a) => (
                      <td key={a.statementId} className="p-0">
                        <Tooltip
                          content={
                            <>
                              <span className="font-bold">
                                {name}, afirmación {a.sequence}:
                              </span>{' '}
                              {a.text}
                              <span className="mt-1 block font-semibold">
                                {a.value} de 5 · {valueLabel(a.value)}
                              </span>
                            </>
                          }
                        >
                          <button
                            type="button"
                            aria-label={`${name}, afirmación ${String(a.sequence)}: ${String(a.value)} de 5, ${valueLabel(a.value)}`}
                            onClick={() => {
                              open(d.dimensionCode, a.statementId);
                            }}
                            className={cn(
                              'focus-visible:ring-ring flex h-10 w-full items-center justify-center text-sm font-bold tabular-nums transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                              CELL[a.value],
                              selected === a.statementId && 'ring-foreground ring-2 ring-offset-1',
                            )}
                          >
                            {a.value}
                          </button>
                        </Tooltip>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul aria-label="Escala de respuesta" className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {VALUES.map((v) => (
            <li key={v} className="text-muted-foreground flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className={cn('flex size-6 items-center justify-center text-sm font-bold', CELL[v])}
              >
                {v}
              </span>
              {valueLabel(v)}
            </li>
          ))}
        </ul>
      </figure>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          aria-label="Respuestas por dimensión"
          className="flex h-auto w-full flex-wrap justify-start gap-1"
        >
          {answers.map((d) => {
            const average = meta.get(d.dimensionCode)?.averageLikert;
            return (
              <TabsTrigger
                key={d.dimensionCode}
                value={d.dimensionCode}
                className="data-[state=active]:border-primary h-auto rounded-none border-b-2 border-transparent px-3 py-2 tracking-normal"
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span>{shortName(d.dimensionCode, d.name)}</span>
                  {average !== undefined && (
                    <span className="text-muted-foreground text-sm font-normal">
                      promedio {formatOneDecimal(average)}
                    </span>
                  )}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {answers.map((d) => (
          <TabsContent key={d.dimensionCode} value={d.dimensionCode}>
            <h3 className="text-foreground text-lg font-bold">{d.name}</h3>
            <ol className="mt-3 flex flex-col">
              {d.answers.map((a) => (
                <AnswerRow
                  key={a.statementId}
                  code={d.dimensionCode}
                  answer={a}
                  selected={selected === a.statementId}
                />
              ))}
            </ol>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * The dimension of a row, as its chip: icon and short name in its tone. On
 * a phone the name is cut to fit, so the eight cells stay on screen; the
 * whole name is in each cell's label and tooltip.
 */
function RowLabel({
  code,
  name,
}: {
  readonly code: DimensionCode;
  readonly name: string;
}): JSX.Element {
  const visual = getDimensionVisual(code);
  const Icon = visual.icon;
  return (
    <span
      title={name}
      className={cn(
        'inline-flex max-w-[6.5rem] items-center gap-1.5 whitespace-nowrap px-1.5 py-1 text-sm font-semibold sm:max-w-none sm:px-2.5',
        visual.chip,
        visual.textInk,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </span>
  );
}

function AnswerRow({
  code,
  answer,
  selected,
}: {
  readonly code: DimensionCode;
  readonly answer: GivenAnswer;
  readonly selected: boolean;
}): JSX.Element {
  const visual = getDimensionVisual(code);
  return (
    <li
      id={`answer-${answer.statementId}`}
      className={cn(
        'border-border grid scroll-mt-40 gap-3 border-b py-4 transition-colors sm:grid-cols-[1fr_12rem] sm:gap-6',
        selected && 'bg-surface-muted -mx-3 px-3',
      )}
    >
      <div>
        <p className="text-foreground text-base">
          <span className="text-muted-foreground font-semibold tabular-nums">
            {answer.sequence}.
          </span>{' '}
          {answer.text}
        </p>
        {answer.justification ? (
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            <span className="font-semibold">Tu justificación:</span> {answer.justification}
          </p>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">Sin justificación.</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <LevelBar level={answer.value} segments={5} fillClass={visual.bg} />
        <p className="text-foreground text-sm">
          <span className="font-bold tabular-nums">{answer.value} de 5</span>
          <span className="text-muted-foreground"> · {valueLabel(answer.value)}</span>
        </p>
      </div>
    </li>
  );
}

import type { DimensionCode, Statement } from '@innlab/contracts';
import { ANSWER_JUSTIFICATION_MAX } from '@innlab/contracts';
import { Check } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { Field, Textarea } from '@/shared/ui/field';
import { TermTooltip } from '@/shared/ui/glossary-term';
import { LikertScale } from './LikertScale';
import { useAnswerForStatement } from '../hooks/useAnswerForStatement';
import { segmentStatement } from '../lib/statement-terms';

/**
 * `StatementCard` — the central component of the IRL questionnaire.
 *
 * Visual specification:
 *  - Padding 16px on mobile and 32px from `sm`, straight corners.
 *  - Header: `Afirmación X de 8` in the dimension's `-ink` tone, after a
 *    mark in its color (usability test P02: the questionnaire follows the
 *    colors of the radar), and, on the right, whether it is complete or
 *    pending.
 *  - Body: the statement at 18px on mobile and 20px from `sm` — tuned to
 *    read 48 statements comfortably, ~60 characters per line. From `sm` it is
 *    justified with Spanish hyphenation (P02 asked for it): the column is
 *    wide enough there to leave no gaps between words; on a phone it stays
 *    left-aligned. Its acronyms and technical terms carry their definition
 *    in a tooltip, and an acronym its words the first time
 *    (`segmentStatement`, usability tests P03, P05).
 *  - The Likert selector (5 options) and, below, the justification: the
 *    reason for the chosen level, optional, saved with the answer when given.
 *
 * The accent color of the dimension (`code`) comes from the parent
 * (`DimensionPanel`) and never mixes with the answer input:
 * answering TRL must be mechanically identical to answering FRL (manual's
 * rule).
 */

interface Props {
  statement: Statement;
  /** The dimension it belongs to, for its color. */
  code?: DimensionCode;
}

export function StatementCard({ statement, code }: Props) {
  const visual = code ? getDimensionVisual(code) : null;
  const { value, setAnswer, justification, setJustification } = useAnswerForStatement(statement.id);
  // The same rule as `isStatementComplete`: the answer is what completes it.
  const complete = value !== null;
  return (
    <Card className="rounded-2xl p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p
          className={`${visual?.textInk ?? 'text-primary'} flex items-center gap-2 text-sm font-bold`}
        >
          {visual && <span className={`${visual.bg} size-2.5 shrink-0`} aria-hidden="true" />}
          Afirmación {statement.sequence} de 8
        </p>
        {complete ? (
          <span className="text-acceptable inline-flex items-center gap-1.5 text-[0.8125rem] font-bold">
            <Check className="size-4" strokeWidth={3} aria-hidden="true" />
            Completa
          </span>
        ) : (
          <span className="text-muted-foreground text-[0.8125rem] font-semibold">Pendiente</span>
        )}
      </div>
      <p
        id={`statement-text-${statement.id}`}
        className="text-foreground mt-3 max-w-[70ch] text-lg font-medium leading-relaxed sm:hyphens-auto sm:text-justify sm:text-xl"
      >
        {segmentStatement(statement.text).map((segment, index) =>
          segment.kind === 'text' ? (
            segment.text
          ) : (
            <span key={index}>
              <TermTooltip explanation={segment.definition} className="inline font-semibold">
                {segment.text}
              </TermTooltip>
              {segment.expansion !== undefined && ` (${segment.expansion})`}
            </span>
          ),
        )}
      </p>

      <LikertScale id={`statement-text-${statement.id}`} value={value} onChange={setAnswer} />

      <Field
        className="mt-5"
        label="¿Por qué elegiste este nivel?"
        hint={`${String(justification.length)} / ${String(ANSWER_JUSTIFICATION_MAX)} caracteres · Opcional`}
      >
        {(control) => (
          <Textarea
            {...control}
            name={`justification-${statement.id}`}
            value={justification}
            maxLength={ANSWER_JUSTIFICATION_MAX}
            rows={3}
            onChange={(e) => {
              setJustification(e.target.value);
            }}
          />
        )}
      </Field>
    </Card>
  );
}

import type { Statement } from '@innlab/contracts';
import { ANSWER_JUSTIFICATION_MAX } from '@innlab/contracts';
import { Check } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Field, Textarea } from '@/shared/ui/field';
import { LikertScale } from './LikertScale';
import { useAnswerForStatement } from '../hooks/useAnswerForStatement';

/**
 * `StatementCard` — the central component of the IRL questionnaire.
 *
 * Visual specification:
 *  - Padding 16px on mobile and 32px from `sm`, straight corners.
 *  - Header: `Afirmación X de 8` in blue (required by tests and
 *    accessibility) and, on the right, whether it is complete or pending.
 *  - Body: the statement at 18px on mobile and 20px from `sm` — tuned to
 *    read 48 statements comfortably, ~60 characters per line.
 *  - The Likert selector (5 options) and, below, the justification: each
 *    answer is saved with the reason for the chosen level (mandatory).
 *
 * The accent color of the dimension code (TRL, CRL, ...) comes from the
 * parent (`DimensionPanel`) and never mixes with the answer input:
 * answering TRL must be mechanically identical to answering FRL (manual's
 * rule).
 */

interface Props {
  statement: Statement;
}

export function StatementCard({ statement }: Props) {
  const { value, setAnswer, justification, setJustification } = useAnswerForStatement(statement.id);
  // The same rule as `isStatementComplete`: an answer and a non-empty justification.
  const complete = value !== null && justification.trim().length > 0;
  return (
    <Card className="rounded-2xl p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-primary text-sm font-bold">Afirmación {statement.sequence} de 8</p>
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
        className="text-foreground mt-3 text-lg font-medium leading-relaxed sm:text-xl"
      >
        {statement.text}
      </p>

      <LikertScale id={`statement-text-${statement.id}`} value={value} onChange={setAnswer} />

      <Field
        className="mt-5"
        label="¿Por qué elegiste este nivel?"
        hint={`${String(justification.length)} / ${String(ANSWER_JUSTIFICATION_MAX)} caracteres · Obligatoria`}
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

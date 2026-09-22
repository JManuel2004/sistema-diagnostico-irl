import type { Statement } from '@innlab/contracts';
import { ANSWER_JUSTIFICATION_MAX } from '@innlab/contracts';
import { Check } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Field, Textarea } from '@/shared/ui/field';
import { LikertScale } from './LikertScale';
import { useAnswerForStatement } from '../hooks/useAnswerForStatement';

/**
 * `StatementCard` — el componente central del cuestionario IRL.
 *
 * Especificación visual:
 *  - Padding 16px en móvil y 32px desde `sm`, esquinas de 20px.
 *  - Cabecera: `Afirmación X de 8` en azul (requisito de tests +
 *    accesibilidad) y, a la derecha, si ya está completa o pendiente.
 *  - Cuerpo: la afirmación a 18px en móvil y 20px desde `sm` — calibrado
 *    para leer 48 afirmaciones cómodamente, ~60 caracteres por línea.
 *  - El selector Likert (5 opciones) y, debajo, la justificación: cada
 *    respuesta se guarda con el porqué del nivel elegido (obligatoria).
 *
 * El acento de color del código de dimensión (TRL, CRL, ...) viene
 * del padre (`DimensionPanel`) y nunca se mezcla con el input de
 * respuesta: responder TRL debe ser mecánicamente idéntico a responder
 * FRL (regla del manual).
 */

interface Props {
  statement: Statement;
}

export function StatementCard({ statement }: Props) {
  const { value, setAnswer, justification, setJustification } = useAnswerForStatement(statement.id);
  // La misma regla que `isStatementComplete`: respuesta y justificación no vacía.
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

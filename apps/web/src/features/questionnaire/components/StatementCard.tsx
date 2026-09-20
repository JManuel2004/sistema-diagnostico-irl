import type { Statement } from '@innlab/contracts';
import { ANSWER_JUSTIFICATION_MAX } from '@innlab/contracts';
import { Card } from '@/shared/ui/card';
import { Field, Textarea } from '@/shared/ui/field';
import { LikertScale } from './LikertScale';
import { useAnswerForStatement } from '../hooks/useAnswerForStatement';

/**
 * `StatementCard` — el componente central del cuestionario IRL.
 *
 * Especificación visual (`DESIGN.md`):
 *  - Padding 20px, esquinas `rounded.md` (8px).
 *  - Eyebrow: dimensión + secuencia en `overline` (uppercase, 8% letter-spacing).
 *    Texto a mostrar: `Afirmación X de 8` (requisito de tests + accesibilidad).
 *  - Cuerpo: la afirmación en `body-lg` (18px / 400) — calibrado para
 *    leer 48 afirmaciones cómodamente, ~60 caracteres por línea.
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
  return (
    <Card className="p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-overline text-muted-foreground">Afirmación {statement.sequence} de 8</p>
        <span aria-hidden="true" className="text-overline text-muted-foreground">
          {statement.dimensionCode}
        </span>
      </div>
      <p
        id={`statement-text-${statement.id}`}
        className="text-body-lg text-foreground mt-3 leading-relaxed"
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

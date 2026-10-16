import { useEffect, useRef, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, buttonVariants } from './button';

interface InProgressChoiceProps {
  /** Where «Continuar» leads: the wizard of the diagnostic in progress. */
  readonly continueTo: string;
  /** Statements already answered in its saved draft, when known. */
  readonly answered?: number;
  readonly onDiscard: () => void;
  readonly discarding: boolean;
  /** Without it there is no «Cancelar» (the start screen has nowhere to go back to). */
  readonly onCancel?: () => void;
}

/**
 * Asks what to do with the diagnostic in progress before starting a new
 * one: its answers are saved, and starting over deletes them. Continuing is
 * the primary action; discarding says what is lost.
 *
 * Focus moves to the question when it appears, so a keyboard or screen
 * reader user lands on it instead of on a button that vanished.
 */
export function InProgressChoice({
  continueTo,
  answered,
  onDiscard,
  discarding,
  onCancel,
}: InProgressChoiceProps): JSX.Element {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const progress =
    answered === undefined ? '' : ` Tiene ${String(answered)} de 48 afirmaciones respondidas.`;

  return (
    <section
      aria-labelledby="in-progress-choice-title"
      className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6"
    >
      <div>
        <h2
          id="in-progress-choice-title"
          ref={heading}
          tabIndex={-1}
          className="text-foreground text-lg font-bold outline-none"
        >
          Tienes un diagnóstico sin terminar
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-prose text-base leading-relaxed">
          {`Tus respuestas están guardadas.${progress} Si inicias uno nuevo, el diagnóstico sin terminar y sus respuestas se descartan y no se pueden recuperar.`}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        <Link to={continueTo} className={`${buttonVariants({ size: 'lg' })} w-full sm:w-auto`}>
          Continuar el que tengo
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
        <Button
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onDiscard}
          disabled={discarding}
        >
          {discarding ? 'Preparando tu diagnóstico…' : 'Descartarlo y empezar uno nuevo'}
        </Button>
        {onCancel && (
          <Button variant="ghost" size="lg" className="w-full sm:w-auto" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </section>
  );
}

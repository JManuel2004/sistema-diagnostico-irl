import { useEffect, useRef, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, buttonVariants } from './button';

interface InProgressChoiceProps {
  /** Shows the dialog; closing it is the caller's `onCancel`. */
  readonly open: boolean;
  /** Where «Continuar» leads: the wizard of the diagnostic in progress. */
  readonly continueTo: string;
  /** Statements already answered in its saved draft, when known. */
  readonly answered?: number;
  readonly onDiscard: () => void;
  readonly discarding: boolean;
  /**
   * «Cancelar» or Escape: nothing is discarded. A click outside does not
   * close it: a destructive choice is never dismissed by accident.
   */
  readonly onCancel: () => void;
}

/**
 * Asks, in a modal, what to do with the diagnostic in progress before
 * starting a new one: its answers are saved, and starting over deletes
 * them. Continuing is the primary action; discarding says what is lost.
 *
 * Built on the native `<dialog>` opened with `showModal()`: the browser
 * makes the rest of the page inert, keeps the focus inside and closes it
 * with Escape, with no dependency. It is an `alertdialog` because it
 * confirms a destructive action; the focus starts on the safe choice.
 */
export function InProgressChoice({
  open,
  continueTo,
  answered,
  onDiscard,
  discarding,
  onCancel,
}: InProgressChoiceProps): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const safeChoice = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
      safeChoice.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const progress =
    answered === undefined ? '' : ` Tiene ${String(answered)} de 48 afirmaciones respondidas.`;

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="in-progress-choice-title"
      aria-describedby="in-progress-choice-text"
      onCancel={(event) => {
        // Escape: the caller decides, so the state stays the single source.
        event.preventDefault();
        onCancel();
      }}
      className="bg-card text-foreground m-auto w-[min(47rem,calc(100vw-2rem))] rounded-2xl border-0 p-0 shadow-xl backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <h2 id="in-progress-choice-title" className="text-foreground text-xl font-bold">
            Tienes un diagnóstico sin terminar
          </h2>
          <p
            id="in-progress-choice-text"
            className="text-muted-foreground mt-2 text-base leading-relaxed"
          >
            {`Tus respuestas están guardadas.${progress} Si inicias uno nuevo, el diagnóstico sin terminar y sus respuestas se descartan y no se pueden recuperar.`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
          <Button variant="ghost" className="w-full sm:order-first sm:w-auto" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onDiscard}
            disabled={discarding}
          >
            {discarding ? 'Preparando tu diagnóstico…' : 'Descartarlo y empezar uno nuevo'}
          </Button>
          <Link ref={safeChoice} to={continueTo} className={`${buttonVariants()} w-full sm:w-auto`}>
            Continuar el que tengo
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </dialog>
  );
}

import { useEffect, useRef, type JSX } from 'react';
import { X } from 'lucide-react';
import type { DimensionCode } from '@innlab/contracts';
import { Button } from '@/shared/ui/button';
import { DimensionChip } from '@/shared/ui/dimension-chip';

/** A dimension a signal points at, with its level and what that level means. */
export interface SignalDimension {
  readonly code: DimensionCode;
  readonly name: string;
  readonly level: number;
  readonly levelDescription: string | null;
}

interface Props {
  /** Shows the dialog; closing it is the caller's `onClose`. */
  readonly open: boolean;
  readonly onClose: () => void;
  /** The signal's name: «Cuello de botella», «Asimetría»… */
  readonly title: string;
  /** What the signal is, in one sentence (the glossary's). */
  readonly meaning: string;
  /** What it says about this initiative, built from its answers. */
  readonly summary: string;
  readonly dimensions: readonly SignalDimension[];
}

/**
 * What a signal of the profile means for this initiative, in a modal opened
 * by clicking, tapping or pressing Enter on its card (usability test P05:
 * the hover alone was not found and said what the term is, not what it means
 * for the initiative). It names the dimensions involved with their level and
 * what that level means, from the profile itself.
 *
 * Built on the native `<dialog>` opened with `showModal()`, like
 * `InProgressChoice`: the browser makes the rest of the page inert, keeps the
 * focus inside and closes it with Escape. A visible button closes it too.
 */
export function SignalDetails({
  open,
  onClose,
  title,
  meaning,
  summary,
  dimensions,
}: Props): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
      close.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="signal-details-title"
      aria-describedby="signal-details-summary"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="bg-card text-foreground m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl border-0 p-0 shadow-xl backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow">Qué significa para tu iniciativa</p>
            <h2 id="signal-details-title" className="text-foreground mt-2 text-xl font-bold">
              {title}
            </h2>
          </div>
          <Button
            ref={close}
            variant="ghost"
            size="icon"
            aria-label="Cerrar"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>

        <p id="signal-details-summary" className="text-foreground text-base leading-relaxed">
          {summary}
        </p>

        {dimensions.length > 0 && (
          <ul className="border-border flex flex-col border-t">
            {dimensions.map((d) => (
              <li key={d.code} className="border-border flex flex-col gap-1.5 border-b py-3">
                <p className="flex flex-wrap items-center gap-3">
                  <DimensionChip code={d.code} name={d.name} />
                  <span className="text-foreground text-base font-bold">Nivel {d.level}</span>
                </p>
                {d.levelDescription !== null && (
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {d.levelDescription}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-muted-foreground text-sm leading-relaxed">{meaning}</p>
      </div>
    </dialog>
  );
}

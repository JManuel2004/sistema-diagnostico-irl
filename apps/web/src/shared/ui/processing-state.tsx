import type { JSX } from 'react';

/**
 * `ProcessingState` — the short wait while a result is being calculated.
 *
 * Same language as the rest of the product: white card, hairline border,
 * Azul Icesi spinner, eyebrow and a sentence. It replaces the inline
 * "Procesando…" on the button so the wait is visible without a new style.
 */
interface ProcessingStateProps {
  readonly overline: string;
  readonly title: string;
  readonly description: string;
}

export function ProcessingState({
  overline,
  title,
  description,
}: ProcessingStateProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border bg-card flex flex-col items-center px-6 py-14 text-center sm:px-10 sm:py-20"
    >
      <span
        aria-hidden="true"
        className="border-azul-icesi/25 border-t-azul-icesi size-12 animate-spin rounded-full border-[3px]"
      />
      <p className="text-eyebrow mb-2 mt-8">{overline}</p>
      <h2 className="text-h2 text-foreground max-w-xl max-sm:text-[1.625rem]">{title}</h2>
      <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
        {description}
      </p>
    </div>
  );
}

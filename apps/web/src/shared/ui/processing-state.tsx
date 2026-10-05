import { useEffect, useState, type JSX } from 'react';
import { CircleCheck, LoaderCircle } from 'lucide-react';
import { PROCESSING_VISIBLE_MS } from '@/shared/lib/hold-for-minimum';

/**
 * `ProcessingState` — what the screen shows while a result is calculated.
 *
 * It is not a waiting spinner: it tells, step by step, what the system is
 * working out (the levels, the imbalances, the service…), so the wait reads
 * as reasoning. The calculation is a single request with no progress of its
 * own, so the steps advance on a clock paced to the minimum time the screen
 * stays visible (`PROCESSING_VISIBLE_MS`); the last one stays in progress
 * until the result arrives, and `done` marks them all as finished.
 *
 * Same language as the rest of the product: white card, hairline border,
 * Azul Icesi for the step in progress. The step icon only spins when the
 * user allows motion (`motion-safe`).
 */
interface ProcessingStateProps {
  readonly overline: string;
  readonly title: string;
  readonly description: string;
  /** What the calculation does, in the order it does it. */
  readonly steps: readonly string[];
  /** The result already arrived: every step is shown as finished. */
  readonly done?: boolean;
}

export function ProcessingState({
  overline,
  title,
  description,
  steps,
  done = false,
}: ProcessingStateProps): JSX.Element {
  const current = useCurrentStep(steps.length, done);

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border bg-card flex flex-col items-center border px-6 py-14 text-center sm:px-10 sm:py-16"
    >
      <p className="text-eyebrow mb-2">{overline}</p>
      <h2 className="text-h2 text-foreground max-w-xl max-sm:text-[1.625rem]">{title}</h2>
      <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
        {description}
      </p>

      <ol className="mt-8 flex w-full max-w-md flex-col gap-3 text-left">
        {steps.map((step, index) => {
          const finished = index < current;
          const inProgress = index === current;
          return (
            <li
              key={step}
              aria-current={inProgress ? 'step' : undefined}
              className={`flex items-start gap-3 text-base leading-snug ${
                finished || inProgress ? 'text-foreground' : 'text-muted-foreground'
              } ${inProgress ? 'font-semibold' : ''}`}
            >
              {finished ? (
                <CircleCheck
                  className="text-acceptable mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
              ) : inProgress ? (
                <LoaderCircle
                  className="text-azul-icesi mt-0.5 size-5 shrink-0 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="border-border mt-0.5 size-5 shrink-0 rounded-full border-2"
                  aria-hidden="true"
                />
              )}
              <span>
                <span className="sr-only">
                  {finished ? 'Listo: ' : inProgress ? 'En curso: ' : 'Pendiente: '}
                </span>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The step in progress: it advances once per slice of the visible time and
 * stops at the last one, which stays in progress until `done`.
 */
function useCurrentStep(count: number, done: boolean): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (done || count <= 1) return;
    const interval = window.setInterval(
      () => {
        setCurrent((step) => Math.min(step + 1, count - 1));
      },
      Math.floor(PROCESSING_VISIBLE_MS / count),
    );
    return () => {
      window.clearInterval(interval);
    };
  }, [count, done]);

  return done ? count : current;
}

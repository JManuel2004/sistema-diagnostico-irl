import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * `WizardStepper` — the steps of a wizard and which one the user is on.
 *
 * The state is not conveyed by color alone (`DESIGN.md`): each step carries
 * its number or a completion mark, and the current one is announced with
 * `aria-current="step"`. Previous steps are links, to go back and correct
 * them; later ones are not: they are reached with «Continuar». Completed
 * steps carry a green check and the line joining them is blue. On mobile
 * the list shrinks to «Paso N de M · Nombre» with a segment bar; going back
 * is done with each step's «Atrás».
 */
export interface WizardStep {
  readonly key: string;
  readonly label: string;
  /** Target of the step; only used if the step is already behind. */
  readonly to: string;
}

interface WizardStepperProps {
  readonly steps: readonly WizardStep[];
  readonly currentKey: string;
  readonly className?: string;
}

const BADGE =
  'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold';

export function WizardStepper({ steps, currentKey, className }: WizardStepperProps): JSX.Element {
  const currentIndex = steps.findIndex((s) => s.key === currentKey);
  const current = steps[currentIndex] as WizardStep | undefined;

  return (
    <nav aria-label="Pasos del diagnóstico" className={className}>
      {/* Mobile: the current step and a segment bar; the list does not fit in a row. */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <p className="text-foreground text-sm font-bold">
          Paso {currentIndex + 1} de {steps.length}
          {current && <span className="text-muted-foreground font-medium"> · {current.label}</span>}
        </p>
        <div aria-hidden="true" className="grid grid-flow-col gap-1">
          {steps.map((step, index) => (
            <span
              key={step.key}
              className={cn('h-1 rounded-sm', index <= currentIndex ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>
      </div>

      <ol className="hidden flex-wrap items-center gap-3 sm:flex">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const isCurrent = index === currentIndex;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  BADGE,
                  isCurrent && 'bg-primary text-primary-foreground',
                  done && 'border-primary text-primary border-[1.5px]',
                  !isCurrent && !done && 'border-input text-muted-foreground border-[1.5px]',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-[0.9375rem]',
                  isCurrent ? 'text-foreground font-bold' : 'text-muted-foreground font-semibold',
                )}
              >
                {step.label}
              </span>
              {done && <span className="sr-only">(completado)</span>}
            </>
          );

          return (
            <li key={step.key} className="flex items-center gap-3">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn('h-0.5 w-8', index <= currentIndex ? 'bg-primary' : 'bg-border')}
                />
              )}
              {done ? (
                <Link
                  to={step.to}
                  className="flex min-h-11 items-center gap-2.5 rounded-sm hover:underline"
                >
                  {content}
                </Link>
              ) : (
                <span
                  className="flex min-h-11 items-center gap-2.5"
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

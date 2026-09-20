import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * `WizardStepper` — los pasos de un asistente y en cuál se va.
 *
 * El estado no se comunica solo por color (`DESIGN.md`): cada paso lleva su
 * número o una marca de completado, y el actual se anuncia con
 * `aria-current="step"`. Los pasos anteriores son enlaces, para volver a
 * corregirlos; los posteriores no lo son: se llega a ellos con «Continuar».
 */
export interface WizardStep {
  readonly key: string;
  readonly label: string;
  /** Destino del paso; solo se usa si el paso ya quedó atrás. */
  readonly to: string;
}

interface WizardStepperProps {
  readonly steps: readonly WizardStep[];
  readonly currentKey: string;
  readonly className?: string;
}

const BADGE = 'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold';

export function WizardStepper({ steps, currentKey, className }: WizardStepperProps): JSX.Element {
  const currentIndex = steps.findIndex((s) => s.key === currentKey);

  return (
    <nav aria-label="Pasos del diagnóstico" className={className}>
      <ol className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  BADGE,
                  current && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-primary text-primary',
                  !current && !done && 'border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-sm',
                  current ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
                )}
              >
                {step.label}
              </span>
              {done && <span className="sr-only">(completado)</span>}
            </>
          );

          return (
            <li key={step.key}>
              {done ? (
                <Link to={step.to} className="flex items-center gap-2 rounded-sm hover:underline">
                  {content}
                </Link>
              ) : (
                <span
                  className="flex items-center gap-2"
                  aria-current={current ? 'step' : undefined}
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

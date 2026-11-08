import type { JSX } from 'react';
import { ArrowRight, Siren, TriangleAlert } from 'lucide-react';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { buttonVariants } from '@/shared/ui/button';
import { DimensionChip } from '@/shared/ui/dimension-chip';
import { cn } from '@/shared/lib/utils';

interface Props {
  readonly profile: Pick<MaturityProfileResponse, 'dimensionResults' | 'gaps' | 'criticalState'>;
  /** Where the next step is: the deep analysis offer, or the service once accepted. */
  readonly nextStep: { readonly href: string; readonly label: string; readonly text: string };
}

/**
 * The warning of a profile with dimensions low on the scale, stronger than
 * the signals' cards: an initiative with low levels has to read that it is
 * worth acting now, with the next step in view (usability test P05). Urgent
 * but honest: it says what is low and why it matters, and nothing else.
 *
 * Nothing is classified here: the low dimensions are the profile's `gaps`;
 * with one of the framework's key dimensions among them (`criticalState`) the
 * warning takes the critical tone. Its link is secondary: the page's primary
 * action stays the one it points to.
 */
export function LowLevelAlert({ profile, nextStep }: Props): JSX.Element | null {
  const low = profile.gaps.dimensions;
  if (low.length === 0) return null;

  const critical = profile.criticalState.dimensions.length > 0;
  const names = new Map(profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]));
  const Icon = critical ? Siren : TriangleAlert;

  return (
    <section
      aria-labelledby="low-level-alert"
      className={cn(
        'border-border bg-card flex flex-col gap-4 border border-t-[3px] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-7',
        critical ? 'border-t-critical' : 'border-t-moderate',
      )}
    >
      <div className="flex gap-4">
        <Icon
          className={cn('mt-0.5 size-7 shrink-0', critical ? 'text-critical' : 'text-moderate')}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-2">
          <h2 id="low-level-alert" className="text-foreground text-xl font-bold">
            {low.length === 1
              ? `1 dimensión de tu iniciativa está en nivel ${String(profile.gaps.threshold)} o menos`
              : `${String(low.length)} dimensiones de tu iniciativa están en nivel ${String(profile.gaps.threshold)} o menos`}
          </h2>
          <p className="flex flex-wrap gap-2">
            {low.map((code) => (
              <DimensionChip key={code} code={code} name={names.get(code) ?? code} />
            ))}
          </p>
          <p className="text-foreground max-w-prose text-base leading-relaxed">
            {low.length === 1
              ? 'Está muy al inicio y frena el avance del resto.'
              : 'Están muy al inicio y frenan el avance del resto.'}{' '}
            {nextStep.text}
          </p>
        </div>
      </div>
      <a
        href={nextStep.href}
        className={`${buttonVariants({ variant: 'secondary' })} w-full shrink-0 sm:w-auto`}
      >
        {nextStep.label}
        <ArrowRight className="size-4" aria-hidden="true" />
      </a>
    </section>
  );
}

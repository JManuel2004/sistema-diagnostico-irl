import type { ComponentProps, JSX, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { Tooltip } from './tooltip';

/**
 * `Chip` — a short attribute with its icon: a level, a band, the tier of a
 * service. Unlike `Badge` it is not a status label: sentence case, a thin
 * border and a soft surface, so a row of them reads as facts of the thing
 * they sit on.
 *
 * With `info` it becomes a button that explains itself in a `Tooltip` (on
 * hover or keyboard focus); the dotted cursor says there is more to read.
 * The text alone always says what the chip means: the tone only repeats it.
 */
const chipVariants = cva(
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap border px-3 text-sm font-semibold leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted border-border text-foreground',
        info: 'bg-azul-icesi/10 border-azul-icesi/35 text-azul-icesi',
        acceptable: 'bg-acceptable/10 border-acceptable/35 text-acceptable',
        moderate: 'bg-moderate/10 border-moderate/35 text-moderate',
        critical: 'bg-critical/10 border-critical/35 text-critical',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

interface ChipProps extends VariantProps<typeof chipVariants> {
  readonly children: ReactNode;
  readonly icon?: LucideIcon;
  /** What the chip means, shown in a tooltip. */
  readonly info?: ReactNode;
  readonly className?: string;
  /** Extra props of the trigger button (focus and hover handlers, aria). */
  readonly triggerProps?: Omit<ComponentProps<'button'>, 'type' | 'className' | 'children'>;
}

export function Chip({
  tone,
  icon: Icon,
  info,
  className,
  triggerProps,
  children,
}: ChipProps): JSX.Element {
  const body = (
    <>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </>
  );
  if (info === undefined) {
    return <span className={cn(chipVariants({ tone }), className)}>{body}</span>;
  }
  return (
    <Tooltip content={info}>
      <button
        type="button"
        {...triggerProps}
        className={cn(
          chipVariants({ tone }),
          'focus-visible:ring-ring cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          className,
        )}
      >
        {body}
      </button>
    </Tooltip>
  );
}

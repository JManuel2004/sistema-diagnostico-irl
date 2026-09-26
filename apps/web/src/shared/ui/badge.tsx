import type { JSX, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

/**
 * `Badge` — short status or category label (sector, stage, severity).
 *
 * The tones are the system's semantic ones; color is never the only
 * signal: the text (and, where needed, an icon) says the same. An uppercase
 * 14px label (never below `text-sm`) over a soft wash of its tone, with
 * straight corners.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-bold uppercase leading-none tracking-[0.06em]',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted border-border text-foreground border',
        info: 'bg-azul-icesi/10 text-azul-icesi',
        critical: 'bg-critical/10 text-critical',
        'critical-solid': 'bg-critical text-critical-foreground',
        moderate: 'bg-moderate/10 text-moderate',
        acceptable: 'bg-acceptable/10 text-acceptable',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  readonly children: ReactNode;
  readonly className?: string;
}

export function Badge({ tone, className, children }: BadgeProps): JSX.Element {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}

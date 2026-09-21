import type { JSX, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

/**
 * `Badge` — etiqueta corta de estado o categoría (sector, etapa, gravedad).
 *
 * Los tonos son los semánticos del sistema; el color nunca es la única señal:
 * el texto (y, donde hace falta, un icono) dice lo mismo. Mínimo `text-sm`.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold leading-none',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface-muted text-foreground',
        info: 'border-info/30 bg-info-bg text-info',
        critical: 'border-critical/30 bg-critical-bg text-critical',
        /** El más alto de la escala de gravedad: relleno pleno, para lo que es urgente. */
        'critical-solid': 'border-critical bg-critical text-critical-foreground',
        moderate: 'border-moderate/30 bg-moderate-bg text-moderate',
        acceptable: 'border-acceptable/30 bg-acceptable-bg text-acceptable',
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

import type { JSX, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

/**
 * `Badge` — etiqueta corta de estado o categoría (sector, etapa, gravedad).
 *
 * Los tonos son los semánticos del sistema; el color nunca es la única señal:
 * el texto (y, donde hace falta, un icono) dice lo mismo. Etiqueta en
 * mayúsculas de 14px (no baja de `text-sm`) sobre un fondo suave de su tono,
 * con esquinas rectas.
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

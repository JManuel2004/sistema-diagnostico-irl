import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

/**
 * Primitivo `Button` alineado con `DESIGN.md` (Icesi).
 *
 * Variantes (jerarquía visual):
 *  - `default` ("primary"): relleno `accent` (Naranja Icesi
 *    oscurecida AA). La acción que cierra la tarea principal.
 *  - `secondary`: superficie blanca con borde y texto Azul Icesi.
 *    Compañera institucional del primario.
 *  - `outline`: alias semántico de `secondary` para retro-compat
 *    con consumidores existentes.
 *  - `ghost`: transparente hasta el hover. Acciones de baja
 *    emphasis dentro de tarjetas / tablas.
 *  - `link`: hipervínculo accesible (Azul Icesi, subrayado en hover).
 *  - `destructive`: rojo crítico. No usado en fase 1.
 *
 * Tamaños: `default` 40px (estándar Icesi), `sm` 36px (filtros),
 * `lg` 44px (CTA hero), `icon` 40×40 (acciones en barra).
 *
 * El `type` por defecto es `"button"` para evitar el submit
 * accidental en formularios; el ref se forwardea para que las
 * librerías que necesiten un nodo DOM (Radix triggers, RHF)
 * funcionen sin envolver el botón en un <span>.
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-[0.9375rem] font-semibold leading-none tracking-[0.005em]',
    'transition-colors duration-150',
    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-pressed shadow-sm',
        secondary:
          'border-primary bg-surface text-primary hover:bg-surface-emphasis active:bg-surface-emphasis border',
        outline:
          'border-primary bg-surface text-primary hover:bg-surface-emphasis active:bg-surface-emphasis border',
        ghost: 'text-primary hover:bg-surface-muted active:bg-surface-emphasis',
        link: 'text-primary h-auto px-0 underline-offset-4 hover:underline focus-visible:ring-offset-0',
        destructive:
          'bg-critical text-critical-foreground hover:bg-critical/90 active:bg-critical/80 shadow-sm',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-11 px-7 text-base',
        icon: 'h-10 w-10 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type, ...props },
  ref,
) {
  return (
    <button
      type={type ?? 'button'}
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

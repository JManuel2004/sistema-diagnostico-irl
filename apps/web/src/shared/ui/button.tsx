import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { cn } from '@/shared/lib/utils';

/**
 * Primitivo `Button` alineado con `DESIGN.md` (Icesi).
 *
 * Variantes (jerarquía visual):
 *  - `default` ("primary"): relleno Azul Icesi, como el «Contáctanos» de
 *    innlab.org (5,5:1 con blanco a cualquier tamaño). La acción que cierra
 *    la tarea principal: una por pantalla.
 *  - `secondary`: superficie blanca con contorno oscuro, en la línea de los
 *    botones negros de innlab.org.
 *  - `outline`: alias semántico de `secondary` para retro-compat
 *    con consumidores existentes.
 *  - `ghost`: transparente hasta el hover. Acciones de baja
 *    emphasis dentro de tarjetas / tablas.
 *  - `link`: hipervínculo accesible (Azul Icesi, subrayado en hover).
 *  - `destructive`: rojo crítico. No usado en fase 1.
 *
 * Tamaños: `default` 44px, `sm` 40px (filtros), `lg` 52px (CTA de
 * pantalla), `icon` 44×44 (acciones en barra). Todos alcanzan el objetivo
 * táctil de 44px salvo `sm`, reservado a escritorio. Esquinas rectas.
 *
 * Deshabilitado no baja la opacidad: pasa a gris con texto legible.
 *
 * El `type` por defecto es `"button"` para evitar el submit
 * accidental en formularios; el ref se forwardea para que las
 * librerías que necesiten un nodo DOM (Radix triggers, RHF)
 * funcionen sin envolver el botón en un <span>.
 */
const buttonBase = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-control font-semibold leading-none tracking-[0.005em]',
    'transition-colors duration-150',
    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:bg-border disabled:text-muted-foreground disabled:pointer-events-none disabled:border-transparent disabled:shadow-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed font-bold',
        secondary:
          'border-foreground bg-surface text-foreground hover:bg-surface-muted active:bg-surface-muted border-[1.5px] font-bold',
        outline:
          'border-foreground bg-surface text-foreground hover:bg-surface-muted active:bg-surface-muted border-[1.5px] font-bold',
        ghost: 'text-primary hover:bg-surface-muted active:bg-surface-emphasis',
        link: 'text-primary h-auto px-0 underline-offset-4 hover:underline focus-visible:ring-offset-0',
        destructive:
          'bg-critical text-critical-foreground hover:bg-critical/90 active:bg-critical/80 shadow-sm',
      },
      size: {
        default: 'h-11 px-5 text-[0.9375rem]',
        sm: 'h-10 px-4 text-sm',
        lg: 'h-[3.25rem] px-7 text-base',
        icon: 'size-11 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/** Las clases de un botón; sirve también para dar forma de botón a un `<Link>`. */
export function buttonVariants(props?: VariantProps<typeof buttonBase>): string {
  return twMerge(buttonBase(props));
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonBase> {}

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

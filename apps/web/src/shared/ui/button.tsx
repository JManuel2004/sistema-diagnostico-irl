import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { cn } from '@/shared/lib/utils';

/**
 * `Button` primitive aligned with `DESIGN.md` (Icesi).
 *
 * Variants (visual hierarchy):
 *  - `default` ("primary"): Azul Icesi fill, like innlab.org's
 *    «Contáctanos» (5.5:1 with white at any size). The action that closes
 *    the main task: one per screen.
 *  - `secondary`: white surface with a dark outline, in the line of
 *    innlab.org's black buttons.
 *  - `outline`: semantic alias of `secondary` for backward compatibility
 *    with existing consumers.
 *  - `ghost`: transparent until hover. Low-emphasis actions inside cards /
 *    tables.
 *  - `link`: accessible hyperlink (Azul Icesi, underlined on hover).
 *  - `destructive`: critical red. Not used yet.
 *
 * Sizes: `default` 44px, `sm` 40px (filters), `lg` 52px (screen CTA),
 * `icon` 44×44 (bar actions). All reach the 44px touch target except `sm`,
 * reserved for desktop. Straight corners.
 *
 * Disabled does not lower the opacity: it turns grey with readable text.
 *
 * The default `type` is `"button"` to avoid accidental submits in forms;
 * the ref is forwarded so libraries that need a DOM node (Radix triggers,
 * form libraries) work without wrapping the button in a <span>.
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

/** The classes of a button; also used to give a `<Link>` the shape of a button. */
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

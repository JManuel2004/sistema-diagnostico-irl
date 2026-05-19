import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Familia `Card` alineada con `DESIGN.md`.
 *
 * El sistema favorece **hairlines Gris 2** (`#CECFD4`) sobre
 * sombras para indicar profundidad — más legible en proyectores
 * de baja DPI usados en talleres de INNLAB (RNF-08).
 *
 * El root es semánticamente neutro (`<div>`). Las páginas que
 * necesiten landmark envuelven la tarjeta en `<section
 * aria-labelledby>` por fuera.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'border-border bg-card text-card-foreground rounded-md border transition-colors',
        className,
      )}
      {...props}
    />
  );
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)} {...props} />
    );
  },
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, children, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-foreground text-[1.375rem] font-semibold leading-tight tracking-tight',
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    );
  },
);

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return (
    <p
      ref={ref}
      className={cn('text-muted-foreground text-sm leading-relaxed', className)}
      {...props}
    />
  );
});

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
    );
  },
);

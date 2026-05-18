import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * `RadioGroup` siguiendo el patrón shadcn/ui sobre
 * `@radix-ui/react-radio-group`.
 *
 * Radix da los roles (`radiogroup`, `radio`) y el manejo de teclado
 * (flechas + Space) gratis. El indicador interno usa el ícono `Circle`
 * de lucide en lugar de pseudo-elementos CSS — es lo que shadcn ship.
 *
 * El componente `LikertScale` del feature `questionnaire` compondrá
 * este primitivo (Stage 2 / HU-08).
 */
export const RadioGroup = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(function RadioGroup({ className, ...props }, ref) {
  return <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />;
});

export const RadioGroupItem = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(function RadioGroupItem({ className, ...props }, ref) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'border-primary text-primary ring-offset-background focus-visible:ring-ring aspect-square h-4 w-4 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});

import type { JSX, ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/shared/lib/utils';

/**
 * `Tooltip` — explicación breve que aparece al pasar el cursor o al enfocar
 * con el teclado. Radix, igual que `Dialog`: gestiona el foco, `Escape`,
 * `aria-describedby` y el posicionamiento.
 *
 * Cada `Tooltip` lleva su propio `Provider`, así que funciona en cualquier
 * parte sin un proveedor global. Superficie y borde son los del sistema
 * (`popover`, `border`); no define color, radio ni sombra propios.
 */

interface TooltipProps {
  readonly content: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps): JSX.Element {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className={cn(
              'bg-popover text-popover-foreground border-border z-50 max-w-xs rounded-md border px-3 py-2 text-sm leading-relaxed shadow-md',
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

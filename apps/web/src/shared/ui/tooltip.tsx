import type { JSX, ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/shared/lib/utils';

/**
 * `Tooltip` — short explanation that appears on hover or on keyboard
 * focus. Radix, like `Dialog`: it manages focus, `Escape`,
 * `aria-describedby` and positioning.
 *
 * Each `Tooltip` carries its own `Provider`, so it works anywhere without a
 * global provider. Surface and border are the system's (`popover`,
 * `border`); it defines no color, radius or shadow of its own.
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

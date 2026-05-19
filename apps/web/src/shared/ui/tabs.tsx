import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/shared/lib/utils';

/**
 * `Tabs` alineado con `DESIGN.md` — segmented control institucional.
 *
 * - Lista en superficie `surface-muted` con hairline Gris 2.
 * - Trigger activo: superficie blanca, texto Azul Icesi, sombra
 *   ligera (`elevation.md`). Inactivos: transparente, texto
 *   secundario.
 * - Radix maneja navegación por teclado (flechas, Home/End) y los
 *   roles ARIA (`tablist`, `tab`, `tabpanel`); no se reimplementan.
 */
export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'border-border bg-surface-muted text-muted-foreground inline-flex h-12 items-center justify-center gap-1 rounded-md border p-1',
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-semibold leading-none tracking-wider transition-all',
        'text-muted-foreground hover:text-foreground',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-md',
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'focus-visible:ring-ring mt-6 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  );
});

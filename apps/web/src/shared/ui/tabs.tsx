import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/shared/lib/utils';

/**
 * `Tabs` — pestañas subrayadas, como la navegación de innlab.org.
 *
 * - Lista sin fondo, con una línea inferior.
 * - Trigger activo: texto en tinta, sin fondo ni sombra; cada uso marca la
 *   pestaña activa con su borde inferior (azul o el color de la dimensión).
 *   Inactivos: texto secundario.
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
        'border-border text-muted-foreground inline-flex h-12 items-center justify-center gap-1 border-b',
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
        'data-[state=active]:text-foreground',
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

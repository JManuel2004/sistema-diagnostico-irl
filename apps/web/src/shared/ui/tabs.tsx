import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/shared/lib/utils';

/**
 * `Tabs` — underlined tabs, like innlab.org's navigation.
 *
 * - List without background, with a bottom line.
 * - Active trigger: ink text, no background or shadow; each use marks the
 *   active tab with its bottom border (blue or the dimension's color).
 *   Inactive ones: secondary text.
 * - Radix handles keyboard navigation (arrows, Home/End) and the ARIA roles
 *   (`tablist`, `tab`, `tabpanel`); they are not reimplemented.
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

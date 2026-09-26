import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines Tailwind classes with smart merging.
 *
 * - `clsx` resolves the conditionals (`{ 'p-2': enabled }`, arrays, etc.).
 * - `twMerge` undoes the typical Tailwind conflicts (e.g. `p-2 p-4` keeps
 *   only `p-4`) — without it, a variant with `p-4` could not override a
 *   default with `p-2`.
 *
 * It is the only authorized way to compose a dynamic `className` in this
 * project. Import as `import { cn } from '@/shared/lib/utils'`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

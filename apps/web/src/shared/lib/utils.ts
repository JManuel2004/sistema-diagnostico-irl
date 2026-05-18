import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind con merge inteligente.
 *
 * - `clsx` resuelve los condicionales (`{ 'p-2': enabled }`, arrays, etc.).
 * - `twMerge` deshace los conflictos típicos de Tailwind (e.g. `p-2 p-4`
 *   conserva solo `p-4`) — sin esto, una variante con `p-4` no podría
 *   sobreescribir un default con `p-2`.
 *
 * Es la única forma autorizada de componer `className` dinámico en este
 * proyecto (ver CLAUDE.web.md §"Stack assumptions"). Importar como
 * `import { cn } from '@/shared/lib/utils'`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

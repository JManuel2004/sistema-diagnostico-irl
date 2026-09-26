import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

/**
 * INNLAB institutional descriptor (Icesi lock-up).
 *
 * The Icesi brand manual (February 2026, section "Centros y observatorios —
 * Construcción del descriptor") requires:
 *
 *   [ Icesi logotype ] | INNLAB Centro de Innovación
 *
 * Non-negotiable rules:
 *  - Separator: 1px Gris 1 (#88898C), height ~30% of the logotype.
 *  - Acronym ("INNLAB") in Plus Jakarta Sans Medium, Azul Icesi.
 *  - Full name right after, in Plus Jakarta Sans Medium.
 *  - INNLAB does not invent a logo of its own: it inherits the
 *    institutional brand.
 *
 * The descriptor appears in the header of every page and links to the
 * start. Which start depends on the screen (`to`): on the screens with a
 * session and navigation (results, panel) it is the panel; on the landing
 * and in the wizard, which carry no navigation, it is the landing. It must
 * not be restyled, and neither the separator color nor the typography may
 * change.
 */
interface BrandDescriptorProps {
  readonly className?: string;
  /** Target of the link. The landing by default. */
  readonly to?: string;
}

export function BrandDescriptor({ className, to = '/' }: BrandDescriptorProps): JSX.Element {
  return (
    <Link
      to={to}
      aria-label="Inicio · Diagnóstico IRL · INNLAB Centro de Innovación · Universidad Icesi"
      className={cn(
        'focus-visible:ring-ring group inline-flex items-center gap-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* Icesi logotype placeholder. The real positive lockup ships
        from the institutional asset pack — never invented locally.
        While the SVG is being procured we render the wordmark in
        Plus Jakarta Sans Bold which matches the institutional
        typeface family. */}
      <span
        aria-hidden="true"
        className="font-display text-foreground text-[1.375rem] font-bold leading-none tracking-tight"
      >
        Icesi
      </span>

      <span aria-hidden="true" className="descriptor-separator h-6" />

      <span className="flex flex-col leading-tight">
        <span className="text-overline text-azul-icesi">INNLAB</span>
        <span className="text-foreground text-[0.8125rem] font-medium">Centro de Innovación</span>
      </span>
    </Link>
  );
}

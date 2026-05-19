import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

/**
 * Descriptor institucional de INNLAB (lock-up Icesi).
 *
 * El manual de marca Icesi (Febrero 2026, sección "Centros y
 * observatorios — Construcción del descriptor") exige:
 *
 *   [ Logotipo Icesi ] | INNLAB Centro de Innovación
 *
 * Reglas no negociables:
 *  - Separador: 1px Gris 1 (#88898C), altura ~30% del logotipo.
 *  - Siglas ("INNLAB") en Plus Jakarta Sans Medium, color Azul Icesi.
 *  - Nombre completo a continuación en Plus Jakarta Sans Medium.
 *  - INNLAB no inventa logo propio: hereda la marca institucional.
 *
 * El descriptor aparece en el header de cada página y enlaza al
 * inicio del sistema. No se debe estilizar, recolorear el separador
 * ni cambiar la tipografía.
 */
interface BrandDescriptorProps {
  readonly className?: string;
}

export function BrandDescriptor({ className }: BrandDescriptorProps): JSX.Element {
  return (
    <Link
      to="/"
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

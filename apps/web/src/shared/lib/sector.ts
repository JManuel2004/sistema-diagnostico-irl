import type { Sector } from '@innlab/contracts';

/**
 * The sector of an initiative as the screens name it: the CIIU section with
 * its code («K. Telecomunicaciones, …»), or the user's own sector when they
 * chose «Otro sector (especificar)».
 */
export function sectorLabel(sector: Sector, customSector: string | null): string {
  if (sector.isOther) return customSector ? `Otro sector: ${customSector}` : sector.name;
  return sector.code ? `${sector.code}. ${sector.name}` : sector.name;
}

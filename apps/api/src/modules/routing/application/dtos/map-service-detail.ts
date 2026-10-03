import type { ServiceDetail } from '@innlab/contracts';
import type { ServiceCatalogEntry } from '../../domain/value-objects/service-catalog-entry.vo.js';

/**
 * The card of a service, from the catalog. Every place that shows a
 * service (the recommendation, its alternatives, a phase of the roadmap)
 * builds it here, so they all describe it the same way.
 *
 * A stored result always points to a service of the catalog: the seed
 * refuses to delete a service a recommendation references. A missing one is
 * therefore a broken invariant, not an outcome.
 */
export function toServiceDetail(
  idService: number,
  catalog: ReadonlyMap<number, ServiceCatalogEntry>,
): ServiceDetail {
  const entry = catalog.get(idService);
  if (!entry) {
    throw new Error(
      `The service ${String(idService)} is not in the portfolio catalog`,
    );
  }
  return {
    idService: entry.idService,
    name: entry.name,
    subtitle: entry.subtitle,
    description: entry.description,
    scope: entry.scope,
    band: entry.band ? { ...entry.band } : null,
    tier: { ...entry.tier },
  };
}

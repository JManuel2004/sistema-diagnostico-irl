import type { ServiceDetail } from '@innlab/contracts';
import { type RoutingConfigurationRepositoryPort } from '../../domain/repositories/routing-configuration.repository.port.js';
import { toServiceDetail } from '../dtos/map-service-detail.js';

/**
 * The catalog card of the given services, by id — a read-only query
 * `routing/` exports so `roadmap/` can show the service of each phase the
 * same way the recommendation shows its own. Read live: the card describes
 * the service, not the result that proposed it.
 */
export class GetServiceDetailsQuery {
  constructor(
    private readonly configuration: RoutingConfigurationRepositoryPort,
  ) {}

  async execute(input: {
    readonly serviceIds: readonly number[];
  }): Promise<ReadonlyMap<number, ServiceDetail>> {
    if (input.serviceIds.length === 0) return new Map();
    const catalog = await this.configuration.findServiceCatalog();
    return new Map(
      input.serviceIds
        .filter((id) => catalog.has(id))
        .map((id) => [id, toServiceDetail(id, catalog)] as const),
    );
  }
}

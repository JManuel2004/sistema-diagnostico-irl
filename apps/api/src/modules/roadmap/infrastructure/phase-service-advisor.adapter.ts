import { Injectable } from '@nestjs/common';
import type { ServiceDetail } from '@innlab/contracts';
import { EvaluatePhaseServiceQuery } from '../../routing/application/use-cases/evaluate-phase-service.query.js';
import { GetServiceDetailsQuery } from '../../routing/application/use-cases/get-service-details.query.js';
import type {
  PhaseServiceAdvisorPort,
  PhaseServiceRequest,
} from '../domain/repositories/phase-service-advisor.port.js';

/**
 * Adapter of `PhaseServiceAdvisorPort` over the read-only queries that
 * `routing/` exports. A missing routing configuration is answered as
 * «no advice»: the roadmap is still calculated, with phases and no services.
 */
@Injectable()
export class PhaseServiceAdvisorAdapter implements PhaseServiceAdvisorPort {
  constructor(
    private readonly evaluate: EvaluatePhaseServiceQuery,
    private readonly details: GetServiceDetailsQuery,
  ) {}

  async advise(request: PhaseServiceRequest) {
    const result = await this.evaluate.execute(request);
    if (!result.ok) return null;
    return { service: result.value.service, trace: result.value.trace };
  }

  describe(
    serviceIds: readonly number[],
  ): Promise<ReadonlyMap<number, ServiceDetail>> {
    return this.details.execute({ serviceIds });
  }
}

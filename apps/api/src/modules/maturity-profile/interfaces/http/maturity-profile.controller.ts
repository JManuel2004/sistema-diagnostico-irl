import { Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ComputeMaturityProfileUseCase } from '../../application/compute-maturity-profile.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

/**
 * HTTP surface for the maturity profile (DIAGIRL-34).
 *
 * `POST /api/v1/diagnosticos/:id/perfil` — computes the six IRL
 * dimensional levels from the previously-submitted answer sheet and
 * persists them. Idempotent in the same sense as the underlying
 * repository: re-running replaces the six `resultado_dimension` rows
 * inside one transaction.
 *
 * `bottleneck` and `imbalances` are intentionally `undefined` in the
 * response shape (the contract schema marks them `.optional()`) —
 * DIAGIRL-35 / DIAGIRL-38 will populate them later.
 */
@ApiTags('perfil')
@Controller('diagnosticos/:id/perfil')
export class MaturityProfileController {
  constructor(private readonly computeProfile: ComputeMaturityProfileUseCase) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Perfil de madurez calculado y persistido (DIAGIRL-34)',
  })
  async compute(
    @Param('id') diagnosticId: string,
  ): Promise<MaturityProfileResponse> {
    const profile = await this.computeProfile.execute({ diagnosticId });
    return {
      diagnosticId: profile.diagnosticId.value,
      computedAt: profile.computedAt.toISOString(),
      dimensionResults: profile.dimensionResults().map((r) => ({
        dimensionCode: r.dimensionCode.value,
        // The contract requires `name`; mirror the code as a sensible
        // placeholder for now. DIAGIRL-37 ("Consultar el resumen
        // numérico del perfil inicial") wires the full dimension name
        // from the catalog into this response.
        name: r.dimensionCode.value,
        averageLikert: r.averageLikert,
        irlLevel: r.irlLevel.value,
      })),
    };
  }
}

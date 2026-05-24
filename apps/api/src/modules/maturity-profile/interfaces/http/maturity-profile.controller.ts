import { Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ComputeMaturityProfileUseCase } from '../../application/compute-maturity-profile.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

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
    const { profile, imbalances } = await this.computeProfile.execute({ diagnosticId });
    const bottleneck = profile.bottleneck();

    const classificationMap = {
      CRITICO: 'critical',
      MODERADO: 'moderate',
      ACEPTABLE: 'acceptable',
    } as const;

    return {
      diagnosticId: profile.diagnosticId.value,
      computedAt: profile.computedAt.toISOString(),
      dimensionResults: profile.dimensionResults().map((r) => ({
        dimensionCode: r.dimensionCode.value,
        name: r.dimensionCode.value,
        averageLikert: r.averageLikert,
        irlLevel: r.irlLevel.value,
      })),
      bottleneck: {
        dimensions: bottleneck.dimensions.map((r) => r.dimensionCode.value),
        level: bottleneck.level,
      },
      imbalances: imbalances.length === 6
        ? imbalances.map((i) => ({
            left: i.left.value,
            right: i.right.value,
            difference: i.difference,
            classification: classificationMap[i.classification],
          }))
        : undefined,
    };
  }
}

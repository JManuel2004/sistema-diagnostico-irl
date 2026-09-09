import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { RoadmapResponse } from '@innlab/contracts';
import { GenerateScalingRoadmapUseCase } from '../../application/generate-scaling-roadmap.use-case.js';
import { toRoadmapResponse } from '../../application/map-roadmap-response.js';

/**
 * Superficie HTTP del roadmap de escalamiento (RF-14).
 *
 * `GET` y no `POST`: el roadmap es una función determinista del perfil y
 * del grafo sembrado, así que consultarlo no crea nada. Con configuración
 * estática, recalcularlo en cada lectura da siempre el mismo resultado;
 * persistirlo solo se vuelve necesario cuando el grafo pueda cambiar y se
 * exija reproducir un roadmap antiguo.
 *
 * Se consulta **por separado** de la recomendación de portafolio. Son dos
 * lecturas independientes del mismo perfil, no una cadena: el roadmap no
 * llama al enrutador ni depende de él. El frontend compone ambas.
 *
 * Si el diagnóstico no tiene perfil calculado, el caso de uso deja
 * propagar el `ConflictError` de `GetMaturityProfileUseCase` → 409,
 * exactamente igual que `GET /diagnosticos/:id/perfil`.
 */
@ApiTags('roadmap')
@Controller('diagnosticos/:id/roadmap')
export class RoadmapController {
  constructor(private readonly generar: GenerateScalingRoadmapUseCase) {}

  @Get()
  @ApiOkResponse({
    description:
      'Roadmap de escalamiento por fases. `phases` vacío significa que la ' +
      'iniciativa cumple el mínimo esperado en las seis dimensiones.',
  })
  async get(@Param('id') diagnosticId: string): Promise<RoadmapResponse> {
    return toRoadmapResponse(await this.generar.execute({ diagnosticId }));
  }
}

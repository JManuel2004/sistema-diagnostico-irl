import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetQuestionnaireStructureQuery } from '../../application/queries/get-questionnaire-structure.query.js';
import { QuestionnaireStructureResponseDto } from './dto/questionnaire-structure.response.dto.js';

/**
 * HTTP surface for the IRL catalog (read-only).
 *
 * Routes:
 *   - `GET /api/v1/catalogo/cuestionario` (HU-07) — 6 dimensions × 8 statements.
 *   - `GET /api/v1/catalogo/tabla-conversion` (E-04) — SA-06 conversion table.
 */
@ApiTags('catalogo')
@Controller('catalogo')
export class IrlCatalogController {
  constructor(
    private readonly getQuestionnaire: GetQuestionnaireStructureQuery,
  ) {}

  @Get('cuestionario')
  @ApiOkResponse({ type: QuestionnaireStructureResponseDto })
  async getQuestionnaireSructure(): Promise<QuestionnaireStructureResponseDto> {
    return this.getQuestionnaire.execute();
  }
}

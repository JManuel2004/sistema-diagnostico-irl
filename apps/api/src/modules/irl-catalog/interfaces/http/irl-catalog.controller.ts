import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetQuestionnaireStructureQuery } from '../../application/queries/get-questionnaire-structure.query.js';
import { QuestionnaireStructureResponseDto } from './dto/questionnaire-structure.response.dto.js';

/**
 * HTTP surface for the IRL catalog (read-only).
 *
 * Routes:
 *   - `GET /api/v1/catalog/questionnaire` (HU-07) — 6 dimensions × 8 statements.
 *   - `GET /api/v1/catalog/conversion-table` (E-04) — SA-06 conversion table.
 */
@ApiTags('catalog')
@Controller('catalog')
export class IrlCatalogController {
  constructor(
    private readonly getQuestionnaire: GetQuestionnaireStructureQuery,
  ) {}

  @Get('questionnaire')
  @ApiOkResponse({ type: QuestionnaireStructureResponseDto })
  async getQuestionnaireStructure(): Promise<QuestionnaireStructureResponseDto> {
    return this.getQuestionnaire.execute();
  }
}

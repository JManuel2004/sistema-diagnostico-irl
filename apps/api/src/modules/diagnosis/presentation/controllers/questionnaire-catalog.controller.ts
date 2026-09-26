import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetQuestionnaireStructureQuery } from '../../application/use-cases/get-questionnaire-structure.query.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { QuestionnaireStructureResponseDto } from './dto/questionnaire-structure.response.dto.js';
import { QuestionnaireVersionQuery } from './dto/questionnaire-version.query.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class QuestionnaireCatalogController {
  constructor(
    private readonly getQuestionnaire: GetQuestionnaireStructureQuery,
  ) {}

  @Get('questionnaire')
  @ApiOperation({
    summary: 'Read the questionnaire',
    description:
      'The six dimensions with their eight statements each, in display order (RF-05), of ' +
      'the framework version given in `version` (a diagnostic answers the version it ' +
      'started with) or of the current one.',
  })
  @ApiOkResponse({ type: QuestionnaireStructureResponseDto })
  @ApiErrors(404, 422)
  async getQuestionnaireStructure(
    @Query() { version }: QuestionnaireVersionQuery,
  ): Promise<QuestionnaireStructureResponseDto> {
    return unwrapResult(await this.getQuestionnaire.execute(version));
  }
}

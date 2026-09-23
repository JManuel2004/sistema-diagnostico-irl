import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetQuestionnaireStructureQuery } from '../../application/use-cases/get-questionnaire-structure.query.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { QuestionnaireStructureResponseDto } from './dto/questionnaire-structure.response.dto.js';

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
      'The six dimensions with their eight statements each, in display order (RF-05).',
  })
  @ApiOkResponse({ type: QuestionnaireStructureResponseDto })
  @ApiErrors()
  async getQuestionnaireStructure(): Promise<QuestionnaireStructureResponseDto> {
    return this.getQuestionnaire.execute();
  }
}

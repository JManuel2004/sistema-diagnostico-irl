import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { SubmitQuestionnaireResponse } from '@innlab/contracts';
import { SubmitQuestionnaireUseCase } from '../../application/use-cases/submit-questionnaire.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { AnswersRequestDto } from './dto/answers.request.dto.js';
import { SubmitQuestionnaireResponseDto } from './dto/diagnosis.response.dto.js';

@ApiTags('questionnaire')
@ApiBearerAuth()
@Controller('diagnostics/:id/questionnaire')
export class QuestionnaireController {
  constructor(private readonly submit: SubmitQuestionnaireUseCase) {}

  @Post()
  @ApiOperation({
    summary: 'Save the answers without computing the profile',
    description:
      'Stores the 48 answers with their justifications. The wizard uses `finalize-initial`, ' +
      'which saves them and computes the profile in one step.',
  })
  @ApiCreatedResponse({ type: SubmitQuestionnaireResponseDto })
  @ApiErrors(422)
  async submitQuestionnaire(
    @Param() { id }: DiagnosticIdParam,
    @Body() body: AnswersRequestDto,
  ): Promise<SubmitQuestionnaireResponse> {
    return unwrapResult(
      await this.submit.execute({ diagnosticId: id, answers: body.answers }),
    );
  }
}

import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { SubmitQuestionnaireUseCase } from '../../application/submit-questionnaire.use-case.js';

/**
 * HTTP surface for the questionnaire (write-side).
 *
 * POST /api/v1/diagnosticos/:id/cuestionario (HU-10 / RF-06) — submits
 * the 48 answers; runs completeness validation and persists the sheet.
 */
@ApiTags('cuestionario')
@Controller('diagnosticos/:id/cuestionario')
export class QuestionnaireController {
  constructor(private readonly submit: SubmitQuestionnaireUseCase) {}

  @Post()
  @ApiCreatedResponse({ description: 'Respuestas registradas exitosamente' })
  submitQuestionnaire(
    @Param('id') diagnosticId: string,
    @Body() body: { answers: { statementId: string; value: number }[] },
  ) {
    return this.submit.execute({ diagnosticId, answers: body.answers });
  }
}

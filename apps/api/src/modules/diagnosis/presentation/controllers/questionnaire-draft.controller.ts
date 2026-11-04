import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { QuestionnaireDraft } from '@innlab/contracts';
import { GetQuestionnaireDraftQuery } from '../../application/use-cases/get-questionnaire-draft.query.js';
import { SaveQuestionnaireDraftUseCase } from '../../application/use-cases/save-questionnaire-draft.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { SaveQuestionnaireDraftRequestDto } from './dto/questionnaire-draft.request.dto.js';
import { QuestionnaireDraftResponseDto } from './dto/diagnosis.response.dto.js';

/**
 * The questionnaire draft saved on the server: what the user answered so
 * far, so it survives closing the session. Only the owner reads or writes
 * it; someone else's diagnostic answers 404.
 */
@ApiTags('questionnaire')
@ApiBearerAuth()
@Controller('diagnostics/:id/questionnaire/draft')
export class QuestionnaireDraftController {
  constructor(
    private readonly getDraft: GetQuestionnaireDraftQuery,
    private readonly saveDraft: SaveQuestionnaireDraftUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Read the saved questionnaire draft',
    description:
      'Empty (`entries: []`, `updatedAt: null`) when nothing was saved.',
  })
  @ApiOkResponse({ type: QuestionnaireDraftResponseDto })
  @ApiErrors(404, 422)
  async get(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuestionnaireDraft> {
    return unwrapResult(
      await this.getDraft.execute({ diagnosticId: id, userId: user.id }),
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Save the questionnaire draft',
    description:
      'Replaces the saved draft with the one sent. The wizard calls it while the user answers. ' +
      '409 once the profile exists; 422 for a statement outside the diagnostic’s questionnaire.',
  })
  @ApiOkResponse({ type: QuestionnaireDraftResponseDto })
  @ApiErrors(404, 409, 422)
  async save(
    @Param() { id }: DiagnosticIdParam,
    @Body() body: SaveQuestionnaireDraftRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuestionnaireDraft> {
    return unwrapResult(
      await this.saveDraft.execute({
        diagnosticId: id,
        userId: user.id,
        entries: body.entries.map((e) => ({
          statementId: e.statementId,
          value: e.value ?? null,
          justification: e.justification ?? null,
        })),
      }),
    );
  }
}

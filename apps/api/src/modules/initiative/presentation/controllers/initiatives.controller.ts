import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { ConsentRecord, InitiativeSummary } from '@innlab/contracts';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { ListMyInitiativesUseCase } from '../../application/use-cases/list-my-initiatives.use-case.js';
import { CreateInitiativeUseCase } from '../../application/use-cases/create-initiative.use-case.js';
import { RecordConsentUseCase } from '../../application/use-cases/record-consent.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { RecordConsentRequestDto } from './dto/initiative.request.dto.js';
import { InitiativeIdParam } from './dto/initiative-id.param.js';
import {
  ConsentRecordResponseDto,
  InitiativeSummaryResponseDto,
} from './dto/initiative.response.dto.js';

/**
 * The initiatives of the authenticated user: listed to diagnose one again,
 * created accepting their consent, and consented again when the text
 * changes version (HU-05, HU-06).
 */
@ApiTags('initiative')
@ApiBearerAuth()
@Controller('initiatives')
export class InitiativesController {
  constructor(
    private readonly list: ListMyInitiativesUseCase,
    private readonly create: CreateInitiativeUseCase,
    private readonly recordConsent: RecordConsentUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List my initiatives',
    description:
      'Most recent first, each with its latest profile and whether its consent is accepted ' +
      'at the current version of the text.',
  })
  @ApiOkResponse({ type: [InitiativeSummaryResponseDto] })
  @ApiErrors()
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<InitiativeSummary[]> {
    return this.list.execute(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an initiative accepting its consent',
    description:
      'Nothing about an initiative is stored before its consent (RF-03), so it is created with ' +
      'the acceptance of the text of `version`. 409 if that is not the current version.',
  })
  @ApiCreatedResponse({ type: InitiativeSummaryResponseDto })
  @ApiErrors(409, 422)
  async createInitiative(
    @Body() body: RecordConsentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InitiativeSummary> {
    return unwrapResult(
      await this.create.execute({ userId: user.id, termsVersion: body.version }),
    );
  }

  @Post(':id/consent')
  @ApiOperation({
    summary: 'Accept the current consent text for an initiative',
    description:
      'Adds an acceptance to the initiative\'s history (earlier ones are kept). 409 if the ' +
      'version is not the current one.',
  })
  @ApiCreatedResponse({ type: ConsentRecordResponseDto })
  @ApiErrors(403, 404, 409, 422)
  async acceptConsent(
    @Param() { id }: InitiativeIdParam,
    @Body() body: RecordConsentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConsentRecord> {
    return unwrapResult(
      await this.recordConsent.execute({ initiativeId: id, userId: user.id, version: body.version }),
    );
  }
}

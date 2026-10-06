import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CoreSession } from '@innlab/contracts';
import { ExchangeSsoCodeUseCase } from '../../application/use-cases/exchange-sso-code.use-case.js';
import { Public } from '../decorators/public.decorator.js';

/**
 * Public stand-in for Core's `GET /auth/sso/exchange`.
 *
 * The SPA calls this instead of Core. Core rejects the deployed site's
 * origin, and a server-side call has no such check. The route stays
 * `@Public()` because the caller has no session yet: the code is what
 * creates it.
 */
@ApiTags('identity')
@Controller('auth/sso')
export class SsoExchangeController {
  constructor(
    @Inject(ExchangeSsoCodeUseCase)
    private readonly exchangeSsoCode: ExchangeSsoCodeUseCase,
  ) {}

  @Public()
  @Get('exchange')
  @ApiOperation({
    summary: 'Exchange an SSO code',
    description:
      'Forwards the one-time code to INNLAB Core and returns the session tokens.',
  })
  @ApiOkResponse({ description: 'id token and access token from INNLAB Core' })
  exchange(@Query('code') code?: string): Promise<CoreSession> {
    const trimmed = code?.trim() ?? '';
    if (trimmed === '') {
      throw new BadRequestException('Missing SSO code');
    }
    return this.exchangeSsoCode.execute(trimmed);
  }
}

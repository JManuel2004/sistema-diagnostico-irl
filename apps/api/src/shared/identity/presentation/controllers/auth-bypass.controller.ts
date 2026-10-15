import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthBypassPolicy } from '../../application/auth-bypass.policy.js';
import { Public } from '../decorators/public.decorator.js';

/**
 * Runtime switch for skipping INNLAB login.
 *
 * Both routes are public. `GET /auth/mode` only tells the SPA whether the
 * switch is on, so a deploy can flip `AUTH_BYPASS` on the API and the
 * already-built frontend follows it. `POST /auth/bypass` issues a local
 * session and answers 404 while the switch is off, so the door does not
 * exist in the normal deploy.
 */
@ApiTags('identity')
@Controller('auth')
export class AuthBypassController {
  constructor(
    @Inject(AuthBypassPolicy) private readonly bypass: AuthBypassPolicy,
  ) {}

  @Public()
  @Get('mode')
  @ApiOperation({ summary: 'Whether this deploy can skip INNLAB login' })
  @ApiOkResponse({ description: '`bypass: true` when AUTH_BYPASS is on' })
  mode(): { bypass: boolean } {
    return { bypass: this.bypass.isEnabled() };
  }

  @Public()
  @Post('bypass')
  @HttpCode(200)
  @ApiOperation({ summary: 'Open a local session without INNLAB' })
  @ApiOkResponse({
    description: 'A session the SPA stores like an SSO exchange',
  })
  open(): { token: string; accessToken: string } {
    if (!this.bypass.isEnabled()) {
      throw new NotFoundException();
    }

    return this.bypass.issue();
  }
}

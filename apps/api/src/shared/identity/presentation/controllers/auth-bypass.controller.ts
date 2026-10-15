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
import { AUTH_PROBE_PORT } from '../../application/ports/auth-probe.port.js';
import type { AuthProbePort } from '../../application/ports/auth-probe.port.js';
import { Public } from '../decorators/public.decorator.js';

/**
 * Testing switch for skipping INNLAB login.
 *
 * `GET /auth/mode` tells the SPA whether this deploy is in validation
 * mode. `POST /auth/bypass` opens a local session only when that mode is
 * on and INNLAB auth has failed to answer promptly three times in a row.
 * Otherwise it answers 404, so a healthy INNLAB keeps the real login.
 */
@ApiTags('identity')
@Controller('auth')
export class AuthBypassController {
  constructor(
    @Inject(AuthBypassPolicy) private readonly bypass: AuthBypassPolicy,
    @Inject(AUTH_PROBE_PORT) private readonly probe: AuthProbePort,
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
  @ApiOperation({
    summary: 'Open a local session after INNLAB auth stays silent',
  })
  @ApiOkResponse({
    description: 'A session the SPA stores like an SSO exchange',
  })
  async open(): Promise<{ token: string; accessToken: string }> {
    const unresponsive = await this.bypass.failsToRespondPromptly(() =>
      this.probe.respondsPromptly(),
    );
    if (!unresponsive) {
      throw new NotFoundException();
    }

    return this.bypass.issue();
  }
}

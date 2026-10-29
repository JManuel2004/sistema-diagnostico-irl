import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import {
  AuthBypassPolicy,
  type BypassCard,
} from '../../application/auth-bypass.policy.js';
import { Public } from '../decorators/public.decorator.js';

class OpenBypassDto {
  @IsUUID()
  userId!: string;
}

/**
 * Testing switch for skipping INNLAB login.
 *
 * `GET /auth/mode` tells the SPA whether to show the same cards as the
 * Bitbucket sign-in simulator. `POST /auth/bypass` opens the session of
 * the card that was pressed. While the switch is off both stay closed, so
 * the real INNLAB login is unchanged. An unknown card is 400, not 401:
 * the SPA treats 401 as a dead session and would send the user to the Hub.
 */
@ApiTags('identity')
@Controller('auth')
export class AuthBypassController {
  constructor(
    @Inject(AuthBypassPolicy) private readonly bypass: AuthBypassPolicy,
  ) {}

  @Public()
  @Get('mode')
  @ApiOperation({ summary: 'Whether this deploy shows the simulated sign-in cards' })
  @ApiOkResponse({
    description: '`bypass: true` and the cards while the testing switch is on',
  })
  mode(): { bypass: boolean; participants: readonly BypassCard[] } {
    return {
      bypass: this.bypass.isEnabled(),
      participants: this.bypass.roster(),
    };
  }

  @Public()
  @Post('bypass')
  @HttpCode(200)
  @ApiOperation({ summary: 'Open the session of one simulated user' })
  @ApiOkResponse({
    description: 'A session the SPA stores like an SSO exchange',
  })
  open(@Body() body: OpenBypassDto): { token: string; accessToken: string } {
    if (!this.bypass.isEnabled()) {
      throw new NotFoundException();
    }

    const session = this.bypass.issue(body.userId);
    if (session === null) {
      throw new BadRequestException('Ese usuario de prueba no existe');
    }
    return session;
  }
}

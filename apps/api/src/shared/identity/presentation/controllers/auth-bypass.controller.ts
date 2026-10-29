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
import { IsString, MinLength } from 'class-validator';
import { AuthBypassPolicy } from '../../application/auth-bypass.policy.js';
import { Public } from '../decorators/public.decorator.js';

class OpenBypassDto {
  @IsString()
  @MinLength(3)
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

/**
 * Testing switch for skipping INNLAB login.
 *
 * `GET /auth/mode` tells the SPA whether this deploy shows a credential
 * form. `POST /auth/bypass` opens a session when the email and password
 * match one test person. While the switch is off both stay closed, so
 * the real INNLAB login is unchanged. A wrong password is 400, not 401:
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
  @ApiOperation({ summary: 'Whether this deploy can skip INNLAB login' })
  @ApiOkResponse({ description: '`bypass: true` when the credential form is on' })
  mode(): { bypass: boolean } {
    return { bypass: this.bypass.isEnabled() };
  }

  @Public()
  @Post('bypass')
  @HttpCode(200)
  @ApiOperation({ summary: 'Open a local session with email and password' })
  @ApiOkResponse({
    description: 'A session the SPA stores like an SSO exchange',
  })
  open(@Body() body: OpenBypassDto): { token: string; accessToken: string } {
    if (!this.bypass.isEnabled()) {
      throw new NotFoundException();
    }

    const session = this.bypass.login(body.email, body.password);
    if (session === null) {
      throw new BadRequestException('Correo o contraseña incorrectos');
    }
    return session;
  }
}

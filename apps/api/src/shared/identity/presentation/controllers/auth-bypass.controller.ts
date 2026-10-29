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
import { AuthBypassPolicy } from '../../application/auth-bypass.policy.js';
import { Public } from '../decorators/public.decorator.js';

class OpenBypassDto {
  @IsUUID()
  userId!: string;
}

/**
 * Testing switch for skipping INNLAB login.
 *
 * `GET /auth/mode` tells the SPA whether this deploy offers the five test
 * people. `POST /auth/bypass` opens that person's session. While the
 * switch is off both stay closed, so the real INNLAB login is unchanged.
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
  @ApiOkResponse({
    description: '`bypass: true` and the five people when AUTH_BYPASS is on',
  })
  mode(): {
    bypass: boolean;
    participants: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      companyName: string | null;
    }[];
  } {
    return {
      bypass: this.bypass.isEnabled(),
      participants: this.bypass.participants().map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        companyName: person.company?.name ?? null,
      })),
    };
  }

  @Public()
  @Post('bypass')
  @HttpCode(200)
  @ApiOperation({ summary: 'Open a local session for one test person' })
  @ApiOkResponse({
    description: 'A session the SPA stores like an SSO exchange',
  })
  open(@Body() body: OpenBypassDto): { token: string; accessToken: string } {
    if (!this.bypass.isEnabled()) {
      throw new NotFoundException();
    }

    const session = this.bypass.issue(body.userId);
    if (session === null) {
      throw new BadRequestException('Esa persona no está en la prueba');
    }
    return session;
  }
}

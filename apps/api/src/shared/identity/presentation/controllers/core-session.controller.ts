import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CORE_SESSION_PORT } from '../../application/ports/core-session.port.js';
import type { CoreSessionPort } from '../../application/ports/core-session.port.js';
import { Public } from '../decorators/public.decorator.js';

/**
 * Public stand-in for Core's introspect and logout.
 *
 * The SPA cannot call those routes: Core rejects the deployed origin.
 * Both stay `@Public()` because a dead token must reach Core instead of
 * stopping at our Cognito guard.
 */
@ApiTags('identity')
@Controller('auth')
export class CoreSessionController {
  constructor(
    @Inject(CORE_SESSION_PORT) private readonly core: CoreSessionPort,
  ) {}

  @Public()
  @Get('introspect')
  @HttpCode(204)
  @ApiOperation({ summary: 'Ask INNLAB whether the access token is still alive' })
  @ApiNoContentResponse({ description: 'The INNLAB session is alive' })
  async introspect(@Headers('authorization') authorization?: string): Promise<void> {
    const token = bearerToken(authorization);
    if (token === undefined) {
      throw new UnauthorizedException();
    }

    const alive = await this.core.introspect(token);
    if (alive === false) {
      throw new UnauthorizedException();
    }
    if (alive === null) {
      throw new HttpException('INNLAB Core no respondio', 503);
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'End the INNLAB session' })
  @ApiNoContentResponse({ description: 'Core accepted the sign-out' })
  async logout(@Headers('authorization') authorization?: string): Promise<void> {
    const token = bearerToken(authorization);
    if (token === undefined) {
      throw new UnauthorizedException();
    }

    await this.core.logout(token);
  }
}

function bearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  return token === '' ? undefined : token;
}

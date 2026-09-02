import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ResolveUserContextUseCase } from '../../application/resolve-user-context.use-case.js';
import { CurrentUser } from '../../infrastructure/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.vo.js';

/**
 * Session surface for the authenticated user (HU-01 / HU-02).
 *
 * `GET /api/v1/me/context` is what the SPA calls right after the SSO
 * exchange to learn who it is talking to. It is also the smoke test for
 * the whole integration: without a bearer token it must answer 401, which
 * proves the global guard is live.
 */
@ApiTags('identidad')
@Controller('me')
export class MeController {
  constructor(
    private readonly resolveUserContext: ResolveUserContextUseCase,
  ) {}

  @Get('context')
  @ApiOkResponse({
    description: 'Identidad del token mas el contexto de empresa de INNLAB Core',
  })
  async getContext(@CurrentUser() user: AuthenticatedUser) {
    const context = await this.resolveUserContext.execute({ userId: user.id });

    return {
      // From the JWT — available with no extra hop.
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      // From INNLAB Core — lives in the innlab_core database, never ours.
      core: {
        companyId: context.companyId,
        companyRole: context.companyRole,
        workspaceId: context.workspaceId,
        companies: context.companies,
      },
    };
  }
}

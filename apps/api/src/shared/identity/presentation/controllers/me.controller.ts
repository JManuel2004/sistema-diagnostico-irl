import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { MeContextResponse } from '@innlab/contracts';
import { ResolveUserContextUseCase } from '../../application/use-cases/resolve-user-context.use-case.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../application/dtos/authenticated-user.js';

/**
 * Session surface for the authenticated user (HU-01 / HU-02).
 *
 * `GET /api/v1/me/context` is what the SPA calls right after the SSO
 * exchange to learn who it is talking to. It is also the smoke test for
 * the whole integration: without a bearer token it must answer 401, which
 * proves the global guard is live.
 */
@ApiTags('identity')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly resolveUserContext: ResolveUserContextUseCase) {}

  @Get('context')
  @ApiOperation({
    summary: 'Read the caller’s context',
    description:
      'The identity of the access token plus the company context INNLAB Core holds for ' +
      'the user (cached in memory for the session).',
  })
  @ApiOkResponse({
    description: 'Token identity plus the company context from INNLAB Core',
  })
  // Typed with the shared contract on purpose: if the backend stops
  // returning what the frontend parses, compilation fails instead of the
  // Zod schema failing at runtime.
  async getContext(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MeContextResponse> {
    const context = await this.resolveUserContext.execute({ userId: user.id });

    return {
      // `id` is the only identity claim a real access token from the shared
      // pool carries. Email and name come from Core, which owns them —-
      // reading them off the token yielded `undefined` and silently dropped
      // them from this response.
      user: {
        id: user.id,
        email: context.email,
        firstName: context.name,
        lastName: context.lastName,
      },
      // From INNLAB Core — lives in the innlab_core database, never ours.
      core: {
        companyId: context.companyId,
        companyRole: context.companyRole,
        workspaceId: context.workspaceId,
        // The domain VO exposes `companies` as readonly; it is copied when
        // crossing the HTTP boundary so that immutability does not leak into
        // the shared contract, where it would be the only readonly schema.
        companies: [...context.companies],
      },
    };
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { MeContextResponse } from '@innlab/contracts';
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
  // Tipado con el contrato compartido a proposito: si el backend deja de
  // devolver lo que el frontend parsea, falla la compilacion en vez de
  // fallar en tiempo de ejecucion contra el schema de Zod.
  async getContext(@CurrentUser() user: AuthenticatedUser): Promise<MeContextResponse> {
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
        // El VO de dominio expone `companies` como readonly; se copia al
        // cruzar la frontera HTTP para no filtrar esa inmutabilidad al
        // contrato compartido, donde seria el unico schema con readonly.
        companies: [...context.companies],
      },
    };
  }
}

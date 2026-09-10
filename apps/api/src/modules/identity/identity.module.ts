import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ResolveUserContextUseCase } from './application/resolve-user-context.use-case.js';
import { USER_CONTEXT_CACHE } from './domain/ports/user-context.cache.port.js';
import type { UserContextCachePort } from './domain/ports/user-context.cache.port.js';
import { USER_CONTEXT_PORT } from './domain/ports/user-context.repository.port.js';
import type { UserContextPort } from './domain/ports/user-context.repository.port.js';
import { InMemoryUserContextCache } from './infrastructure/cache/in-memory-user-context.cache.js';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard.js';
import { InnlabCoreHttpClient } from './infrastructure/http/innlab-core-http.client.js';
import { CognitoJwtStrategy } from './infrastructure/strategies/cognito-jwt.strategy.js';
import { MeController } from './interfaces/http/me.controller.js';

/**
 * Identity bounded context — the ecosystem session (HU-01 / RF-00).
 *
 * `@Global()` because every other module resolves the caller's identity:
 * re-importing this module everywhere would be noise.
 *
 * Registering `JwtAuthGuard` as `APP_GUARD` here makes authentication the
 * default for the whole application, not an opt-in per controller. Routes
 * that must stay open carry `@Public()`.
 *
 * `ResolveUserContextUseCase` is wired with a factory rather than
 * `@Injectable()`: the application layer may not import `@nestjs/common`
 * (enforced in `eslint.config.mjs`), so the framework knowledge stays here.
 */
@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    CognitoJwtStrategy,
    { provide: USER_CONTEXT_PORT, useClass: InnlabCoreHttpClient },
    { provide: USER_CONTEXT_CACHE, useClass: InMemoryUserContextCache },
    {
      provide: ResolveUserContextUseCase,
      useFactory: (port: UserContextPort, cache: UserContextCachePort) =>
        new ResolveUserContextUseCase(port, cache),
      inject: [USER_CONTEXT_PORT, USER_CONTEXT_CACHE],
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [MeController],
  exports: [ResolveUserContextUseCase, USER_CONTEXT_PORT, PassportModule],
})
export class IdentityModule {}

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { ConfigType } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { appConfig } from '../../../../config/configuration.js';
import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.vo.js';

/**
 * Claims we consume from an INNLAB Cognito access token. Cognito emits
 * more; untyped on purpose because we do not read them.
 */
interface CognitoAccessTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly given_name?: string;
  readonly family_name?: string;
  /** `'access'` or `'id'`. Only `'access'` is accepted — see below. */
  readonly token_use?: string;
}

/**
 * Validates the bearer token against the shared INNLAB Cognito User Pool.
 *
 * Validation is local and offline: `jwks-rsa` caches the pool's public
 * keys, so no request reaches Cognito or Core on the hot path. Signature,
 * issuer and algorithm are checked.
 *
 * Two deliberate decisions, both inherited from the reference integration
 * that already runs in production (`foresight-backend`):
 *
 *  1. **No audience / `client_id` check.** Any valid token from the shared
 *     User Pool passes this guard, in any product of the ecosystem. That
 *     is the ecosystem's design, not an oversight: the JWT proves "you are
 *     a legitimate INNLAB user", while per-product authorization is a
 *     separate question answered by Core
 *     (`GET /internal/companies/:companyId/product-access?product=...`).
 *     Departing from it is a security decision to take explicitly, not a
 *     detail to change in passing.
 *
 *  2. **`token_use` must be `'access'`.** The SSO exchange returns both
 *     `token` (the id_token) and `accessToken`; only the latter authen-
 *     ticates. Core enforces the same check, so accepting an id_token here
 *     would let a request pass our guard and then fail at Core with an
 *     opaque 401. Rejecting it at the edge keeps the error legible.
 */
@Injectable()
export class CognitoJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(appConfig.KEY) config: ConfigType<typeof appConfig>,
  ) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: config.cognito.jwksUri,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: config.cognito.issuer,
      algorithms: ['RS256'],
    });
  }

  /**
   * Return value becomes `req.user`. It carries token claims only —
   * `companyId`/`companyRole` are resolved on demand through
   * `ResolveUserContextUseCase`, never guessed from the token.
   */
  validate(payload: CognitoAccessTokenPayload): AuthenticatedUser {
    if (payload.token_use !== undefined && payload.token_use !== 'access') {
      throw new UnauthorizedException(
        'Se requiere un access token; el id_token no autentica peticiones.',
      );
    }

    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
    };
  }
}

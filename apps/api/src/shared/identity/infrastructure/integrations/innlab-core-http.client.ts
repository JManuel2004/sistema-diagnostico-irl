import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { appConfig } from '../../../../config/configuration.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/index.js';
import type { UserContext } from '../../domain/entities/user-context.vo.js';
import type { UserContextPort } from '../../domain/repositories/user-context.repository.port.js';

/**
 * Slug registered for this product in the `Product` table of INNLAB Core.
 *
 * It is the value that travels in `?product=` on several `/internal/*`
 * endpoints. PENDING: the Core team must register it on their side —
 * until they confirm, calls that carry it will not resolve.
 */
export const PRODUCT_SLUG = 'DIAG-IRL';

/**
 * EXTERNAL INTEGRATION — not domain logic of this system (SEMI).
 *
 * This class is the single point of HTTP contact with INNLAB Core, a
 * platform service this system does not own. It translates Core's shape
 * into `UserContext`/`AuthenticatedUser` and back; it never encodes an
 * SEMI business rule. Flagged explicitly because `shared/identity/` now
 * lives beside `shared/kernel/` and `shared/irl-taxonomy/`, and the
 * folder name alone no longer signals "anticorruption layer" as clearly
 * as it did when `identity` was the only module of its kind in the tree
 * (`convenciones-objetivo.md` §1.1).
 *
 * Adapter for the `/internal/*` surface of `innlab-core-api`.
 *
 * Backend-to-backend only; never reachable from the browser. Authenticated
 * with the static `x-internal-key` shared secret — there is no OAuth
 * `client_credentials` exchange and no token to refresh.
 *
 * Uses the global `fetch` (Node 22) rather than an HTTP client dependency:
 * these are a handful of stateless GETs and an explicit `AbortSignal`
 * timeout is all the machinery they need.
 */
@Injectable()
export class InnlabCoreHttpClient implements UserContextPort {
  private readonly logger = new Logger(InnlabCoreHttpClient.name);

  constructor(
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async getUserContext(userId: string): Promise<UserContext> {
    return this.get<UserContext>(
      `/internal/users/${encodeURIComponent(userId)}/context`,
      'user context',
      userId,
    );
  }

  /**
   * Features enabled for this user in this product.
   *
   * Not consumed yet — kept because it is part of the same contract and
   * the next story that needs per-product gating starts here.
   */
  async getUserFeatures(userId: string): Promise<{ features: string[] }> {
    return this.get<{ features: string[] }>(
      `/internal/users/${encodeURIComponent(userId)}/features?product=${PRODUCT_SLUG}`,
      'user features',
      userId,
    );
  }

  /**
   * Whether a company has access to this product. This — not the JWT — is
   * where per-product authorization is decided in the INNLAB ecosystem
   * (see the note in `cognito-jwt.strategy.ts`).
   */
  async getProductAccess(companyId: string): Promise<{
    hasAccess: boolean;
    plan: string | null;
    expiresAt: string | null;
  }> {
    return this.get(
      `/internal/companies/${encodeURIComponent(companyId)}/product-access?product=${PRODUCT_SLUG}`,
      'acceso a producto',
      companyId,
    );
  }

  private async get<T>(
    path: string,
    resource: string,
    identifier: string,
  ): Promise<T> {
    const url = `${this.config.innlabCore.baseUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-internal-key': this.config.innlabCore.internalKey,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.config.innlabCore.timeoutMs),
      });
    } catch (cause) {
      // Network failure or timeout. Deliberately not downgraded to a
      // "user has no company" answer: an unreachable Core is an outage,
      // and silently treating it as empty context would hide it.
      this.logger.error(
        `INNLAB Core unreachable while reading ${resource} for '${identifier}'`,
      );
      throw new Error(`INNLAB Core no respondio a ${path}`, { cause });
    }

    if (response.status === 404) {
      throw new NotFoundError(resource, identifier);
    }

    if (!response.ok) {
      // 401/403 here means OUR x-internal-key is wrong or unregistered —
      // it says nothing about the end user's token.
      this.logger.error(
        `INNLAB Core answered ${String(response.status)} for ${path}`,
      );
      throw new Error(
        `INNLAB Core respondio ${String(response.status)} a ${path}`,
      );
    }

    return (await response.json()) as T;
  }
}

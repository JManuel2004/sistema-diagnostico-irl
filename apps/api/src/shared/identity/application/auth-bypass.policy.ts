import { createHmac, timingSafeEqual } from 'node:crypto';
import type { MeContextResponse } from '@innlab/contracts';
import type { AuthenticatedUser } from '../domain/entities/authenticated-user.vo.js';
import {
  BYPASS_EMAIL,
  BYPASS_FIRST_NAME,
  BYPASS_ISSUER,
  BYPASS_LAST_NAME,
  BYPASS_USER_ID,
} from '../domain/bypass-identity.js';

const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

interface BypassClaims {
  readonly sub?: string;
  readonly iss?: string;
  readonly exp?: number;
  readonly token_use?: string;
}

/**
 * The switch that lets a deploy skip INNLAB login.
 *
 * `enabled` comes from `AUTH_BYPASS` on the API. While it is off, tokens
 * signed with the bypass secret are ignored and the Cognito guard is the
 * only door. While it is on, the SPA can ask for a local session and the
 * profile is answered here, without calling Core.
 *
 * Framework-free on purpose: the identity module constructs it with the
 * already-validated config.
 */
export class AuthBypassPolicy {
  constructor(
    private readonly enabled: boolean,
    private readonly secret: string,
  ) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  isBypassUser(userId: string): boolean {
    return this.enabled && userId === BYPASS_USER_ID;
  }

  /** A session the SPA can store. `token` stays empty: only `accessToken` authenticates. */
  issue(nowMs: number = Date.now()): { token: ''; accessToken: string } {
    return { token: '', accessToken: signBypassToken(this.secret, nowMs) };
  }

  /**
   * Accepts a bearer issued by `issue` and only while the switch is on.
   * Any other token, including a forged one with the flag off, is `null`
   * so the Cognito strategy keeps the request.
   */
  authenticate(token: string | undefined): AuthenticatedUser | null {
    if (!this.enabled || token === undefined || token === '') {
      return null;
    }

    return verifyBypassToken(token, this.secret);
  }

  /** Profile for the bypass leader. Core is not consulted. */
  profile(): MeContextResponse {
    return {
      user: {
        id: BYPASS_USER_ID,
        email: BYPASS_EMAIL,
        firstName: BYPASS_FIRST_NAME,
        lastName: BYPASS_LAST_NAME,
      },
      core: {
        companyId: null,
        companyRole: null,
        workspaceId: null,
        companies: [],
      },
    };
  }
}

function signBypassToken(
  secret: string,
  nowMs: number,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      sub: BYPASS_USER_ID,
      iss: BYPASS_ISSUER,
      token_use: 'access',
      exp: Math.floor(nowMs / 1000) + ttlSeconds,
    }),
  );
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

function verifyBypassToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): AuthenticatedUser | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts as [string, string, string];
  const expected = sign(`${header}.${payload}`, secret);
  if (!safeEqual(signature, expected)) return null;

  let claims: BypassClaims;
  try {
    claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as BypassClaims;
  } catch {
    return null;
  }

  if (claims.iss !== BYPASS_ISSUER || claims.token_use !== 'access')
    return null;
  if (claims.sub !== BYPASS_USER_ID) return null;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs) return null;

  return {
    id: BYPASS_USER_ID,
    email: BYPASS_EMAIL,
    firstName: BYPASS_FIRST_NAME,
    lastName: BYPASS_LAST_NAME,
  };
}

function sign(unsigned: string, secret: string): string {
  return createHmac('sha256', secret).update(unsigned).digest('base64url');
}

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function safeEqual(received: string, expected: string): boolean {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

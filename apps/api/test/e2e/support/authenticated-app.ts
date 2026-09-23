import { generateKeyPairSync, sign } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import nock from 'nock';
import { appConfig } from '../../../src/config/configuration.js';

/**
 * Authentication for the e2e suites that boot the real `AppModule`.
 *
 * `JwtAuthGuard` is registered as `APP_GUARD` (see `identity.module.ts`),
 * so it protects the whole HTTP surface by default. These suites exercise
 * business flows against the database: without a token, every request
 * answers 401 and the suite never reaches what it means to test.
 *
 * Replacing the guard is not an option: neither `overrideGuard(JwtAuthGuard)`
 * nor `overrideProvider(APP_GUARD)` reaches the instance Nest mounts in the
 * global pipeline (checked — both still return 401). So instead of dodging
 * authentication, the suite goes through it: it mints its own RS256 token
 * and serves the public key as JWKS with `nock`, the same pattern as
 * `shared/identity/cognito-jwt-guard.e2e-spec.ts`.
 *
 * No account of the shared Cognito pool takes part, and the issuer and the
 * JWKS URI are read from the config the app already loaded — so this works
 * the same with real credentials as with the placeholders of
 * `.env.example`.
 */
const KID = 'e2e-key-1';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** Claims of the user the e2e suites see as authenticated. */
export const E2E_USER = {
  sub: 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
  email: 'e2e@icesi.edu.co',
  given_name: 'Usuario',
  family_name: 'E2E',
  token_use: 'access',
};

/**
 * Serves the test JWKS and returns the ready `Authorization` header.
 *
 * Called after `app.init()`: `jwks-rsa` does not ask for the keys until the
 * first authenticated request, so the intercept arrives in time.
 *
 *   const auth = authenticateAgainst(app);
 *   await request(server).get(url).set('Authorization', auth);
 *
 * `subject` changes the token's `sub`. The suites run in parallel over the
 * same database and `POST /diagnostics` is idempotent per user, so a suite
 * that starts diagnostics needs its own user so it never resumes another's.
 *
 * Remember `nock.cleanAll()` in the suite's `afterAll`.
 */
export function authenticateAgainst(
  app: INestApplication,
  subject: string = E2E_USER.sub,
): string {
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const { jwksUri, issuer } = config.cognito;

  const url = new URL(jwksUri);
  const jwk = publicKey.export({ format: 'jwk' });

  nock(url.origin)
    .persist()
    .get(url.pathname)
    .reply(200, { keys: [{ ...jwk, kid: KID, alg: 'RS256', use: 'sig' }] });

  const header = base64url(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KID }),
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ iss: issuer, iat: now, exp: now + 3600, ...E2E_USER, sub: subject }),
  );
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`),
    privateKey,
  );

  return `Bearer ${header}.${payload}.${base64url(signature)}`;
}

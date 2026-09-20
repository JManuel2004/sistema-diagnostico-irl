import { generateKeyPairSync, sign } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import nock from 'nock';
import { appConfig } from '../../../src/config/configuration.js';

/**
 * Autenticacion para las suites e2e que arrancan el `AppModule` real.
 *
 * `JwtAuthGuard` se registra como `APP_GUARD` (ver `identity.module.ts`),
 * asi que protege toda la superficie HTTP por defecto. Estas suites
 * ejercitan flujos de negocio contra la base de datos: sin un token, cada
 * peticion responde 401 y la suite nunca llega a lo que pretende probar.
 *
 * Sustituir el guard no es una opcion: ni `overrideGuard(JwtAuthGuard)` ni
 * `overrideProvider(APP_GUARD)` alcanzan a la instancia que Nest monta en
 * el pipeline global (comprobado — ambos siguen devolviendo 401). Asi que
 * en vez de esquivar la autenticacion, la suite la atraviesa: se acuna un
 * RS256 propio y se sirve la clave publica como JWKS con `nock`, el mismo
 * patron de `shared/identity/cognito-jwt-guard.e2e-spec.ts`.
 *
 * Ninguna cuenta del pool Cognito compartido participa, y el issuer y la
 * URI del JWKS se leen de la config que la app ya cargo — de modo que esto
 * funciona igual con credenciales reales que con los placeholders de
 * `.env.example`.
 */
const KID = 'e2e-key-1';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** Claims del usuario que las suites e2e ven como autenticado. */
export const E2E_USER = {
  sub: 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
  email: 'e2e@icesi.edu.co',
  given_name: 'Usuario',
  family_name: 'E2E',
  token_use: 'access',
};

/**
 * Sirve el JWKS de prueba y devuelve la cabecera `Authorization` lista.
 *
 * Se llama despues de `app.init()`: `jwks-rsa` no pide las claves hasta la
 * primera peticion autenticada, asi que el intercepto llega a tiempo.
 *
 *   const auth = authenticateAgainst(app);
 *   await request(server).get(url).set('Authorization', auth);
 *
 * `subject` cambia el `sub` del token. Las suites corren en paralelo sobre la
 * misma base y `POST /diagnostics` es idempotente por usuario, así que una
 * suite que inicia diagnósticos necesita su propio usuario para no reanudar el
 * de otra.
 *
 * Recuerda `nock.cleanAll()` en el `afterAll` de la suite.
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

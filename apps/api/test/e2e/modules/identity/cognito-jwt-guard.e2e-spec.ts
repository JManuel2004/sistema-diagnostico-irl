import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { generateKeyPairSync, sign } from 'node:crypto';
import type { Server } from 'node:http';
import nock from 'nock';
import request from 'supertest';
import { appConfig } from '../../../../src/config/configuration.js';
import { CurrentUser } from '../../../../src/modules/identity/infrastructure/decorators/current-user.decorator.js';
import { Public } from '../../../../src/modules/identity/infrastructure/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../../../src/modules/identity/infrastructure/guards/jwt-auth.guard.js';
import { CognitoJwtStrategy } from '../../../../src/modules/identity/infrastructure/strategies/cognito-jwt.strategy.js';
import type { AuthenticatedUser } from '../../../../src/modules/identity/domain/entities/authenticated-user.vo.js';

/**
 * E2E: the global guard against a real `passport-jwt` + `jwks-rsa` round trip.
 *
 * The unit specs only exercise `validate()` with a payload already parsed.
 * Everything that actually decides whether a request is authenticated —
 * signature verification, issuer matching, algorithm restriction, JWKS key
 * lookup by `kid` — lives inside passport and never ran until this suite.
 *
 * No account in the shared INNLAB Cognito pool is involved: the suite mints
 * its own RSA key, serves it as a JWKS document through `nock`, and signs
 * its own tokens. That is what makes a valid-token test possible while the
 * real credentials are still pending.
 *
 * The failure this guards against is specific: if a genuine token were
 * rejected here, the SPA would see a 401, clear the session, bounce to the
 * Hub, come back authenticated, get 401 again — an endless redirect loop
 * that looks like "login is broken" while login is in fact fine.
 */
const ISSUER = 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_test';
const JWKS_PATH = '/us-east-2_test/.well-known/jwks.json';
const JWKS_HOST = 'https://cognito-idp.us-east-2.amazonaws.com';
const KID = 'test-key-1';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** Mints an RS256 token the way Cognito would, signed with our test key. */
function mintToken(
  claims: Record<string, unknown>,
  options: { kid?: string; issuer?: string } = {},
): string {
  const header = base64url(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: options.kid ?? KID }),
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: options.issuer ?? ISSUER,
      iat: now,
      exp: now + 3600,
      ...claims,
    }),
  );
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`),
    privateKey,
  );
  return `${header}.${payload}.${base64url(signature)}`;
}

const VALID_CLAIMS = {
  sub: 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
  email: 'ana@icesi.edu.co',
  given_name: 'Ana',
  family_name: 'Ramirez',
  token_use: 'access',
};

@Controller()
class ProbeController {
  @Get('protegido')
  protegido(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Get('abierto')
  abierto() {
    return { ok: true };
  }
}

describe('Guard global de Cognito (e2e)', () => {
  let app: INestApplication;
  // `getHttpServer()` devuelve `any`; se estrecha una vez aqui en vez de
  // arrastrar ese `any` hasta cada llamada de supertest.
  let server: Server;

  beforeAll(async () => {
    // `generateKeyPairSync` ya entrega KeyObjects, asi que el publico se
    // exporta a JWK directamente — es lo que sirve el endpoint de Cognito.
    const jwk = publicKey.export({ format: 'jwk' });
    nock(JWKS_HOST)
      .persist()
      .get(JWKS_PATH)
      .reply(200, { keys: [{ ...jwk, kid: KID, alg: 'RS256', use: 'sig' }] });

    const moduleFixture = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [ProbeController],
      providers: [
        // Only the cognito slice of AppConfig is read by the strategy, so the
        // namespace is supplied directly — no env file, no database, no
        // ConfigModule needed to exercise authentication.
        {
          provide: appConfig.KEY,
          useValue: {
            cognito: { jwksUri: `${JWKS_HOST}${JWKS_PATH}`, issuer: ISSUER },
          },
        },
        CognitoJwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    nock.cleanAll();
    await app.close();
  });

  it('acepta un token valido y expone las claims como usuario', async () => {
    const response = await request(server)
      .get('/protegido')
      .set('Authorization', `Bearer ${mintToken(VALID_CLAIMS)}`)
      .expect(200);

    expect(response.body).toEqual({
      id: VALID_CLAIMS.sub,
      email: VALID_CLAIMS.email,
      firstName: 'Ana',
      lastName: 'Ramirez',
    });
  });

  it('rechaza una peticion sin cabecera Authorization', async () => {
    await request(server).get('/protegido').expect(401);
  });

  it('rechaza un token emitido por otro issuer', async () => {
    const foreign = mintToken(VALID_CLAIMS, {
      issuer: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_otro',
    });

    await request(server)
      .get('/protegido')
      .set('Authorization', `Bearer ${foreign}`)
      .expect(401);
  });

  it('rechaza un id_token donde se espera un access token', async () => {
    const idToken = mintToken({ ...VALID_CLAIMS, token_use: 'id' });

    await request(server)
      .get('/protegido')
      .set('Authorization', `Bearer ${idToken}`)
      .expect(401);
  });

  it('rechaza un token firmado con otra clave', async () => {
    const intruder = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const header = base64url(
      JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KID }),
    );
    const now = Math.floor(Date.now() / 1000);
    const payload = base64url(
      JSON.stringify({ iss: ISSUER, iat: now, exp: now + 3600, ...VALID_CLAIMS }),
    );
    const forged = `${header}.${payload}.${base64url(
      sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), intruder.privateKey),
    )}`;

    await request(server)
      .get('/protegido')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });

  it('rechaza un token cuyo kid no esta en el JWKS', async () => {
    await request(server)
      .get('/protegido')
      .set('Authorization', `Bearer ${mintToken(VALID_CLAIMS, { kid: 'otro-kid' })}`)
      .expect(401);
  });

  it('deja pasar una ruta @Public() sin token', async () => {
    await request(server).get('/abierto').expect(200, { ok: true });
  });
});

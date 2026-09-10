import { UnauthorizedException } from '@nestjs/common';
import { CognitoJwtStrategy } from '../../../../../src/modules/identity/infrastructure/strategies/cognito-jwt.strategy.js';
import type { AppConfig } from '../../../../../src/config/configuration.js';

/**
 * Only `validate()` is exercised here. Signature and issuer verification
 * happen inside `passport-jwt` + `jwks-rsa` against the shared Cognito
 * pool — that path needs a real (or nock-mocked) JWKS endpoint and belongs
 * in the e2e tier, not here.
 */
const CONFIG = {
  cognito: {
    jwksUri:
      'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test/.well-known/jwks.json',
    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test',
  },
} as AppConfig;

describe('CognitoJwtStrategy', () => {
  const strategy = new CognitoJwtStrategy(CONFIG);

  it('maps Cognito claims onto the authenticated user', () => {
    const user = strategy.validate({
      sub: 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
      email: 'ana@icesi.edu.co',
      given_name: 'Ana',
      family_name: 'Ramirez',
      token_use: 'access',
    });

    expect(user).toEqual({
      id: 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
      email: 'ana@icesi.edu.co',
      firstName: 'Ana',
      lastName: 'Ramirez',
    });
  });

  it('rejects an id_token used where an access token is required', () => {
    expect(() =>
      strategy.validate({
        sub: 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
        email: 'ana@icesi.edu.co',
        token_use: 'id',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('carries no company context — that only exists in INNLAB Core', () => {
    const user = strategy.validate({
      sub: 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
      email: 'ana@icesi.edu.co',
      token_use: 'access',
    });

    expect(user).not.toHaveProperty('companyId');
    expect(user).not.toHaveProperty('companyRole');
  });

  /**
   * Shape of a real access token from the shared INNLAB pool, captured from
   * a live session: no `email`, no `given_name`, no `family_name`. The guard
   * must still authenticate it — treating the missing claims as a reason to
   * reject would lock out every genuine user.
   */
  it('acepta el token real del pool, que solo trae sub', () => {
    const user = strategy.validate({
      sub: 'e17bc500-30f1-7037-ff18-f860e2b77806',
      token_use: 'access',
    } as Parameters<typeof strategy.validate>[0]);

    expect(user.id).toBe('e17bc500-30f1-7037-ff18-f860e2b77806');
    expect(user.email).toBeUndefined();
  });
});

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
});

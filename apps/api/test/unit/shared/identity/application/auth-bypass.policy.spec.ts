import { describe, expect, it } from '@jest/globals';
import { AuthBypassPolicy } from '../../../../../src/shared/identity/application/auth-bypass.policy.js';
import { BYPASS_USER_ID } from '../../../../../src/shared/identity/domain/bypass-identity.js';

const SECRET = 'test-secret';

describe('AuthBypassPolicy', () => {
  it('rechaza cualquier token mientras el interruptor está apagado', () => {
    const off = new AuthBypassPolicy(false, SECRET);
    const on = new AuthBypassPolicy(true, SECRET);

    const { accessToken } = on.issue();

    expect(off.authenticate(accessToken)).toBeNull();
    expect(off.isBypassUser(BYPASS_USER_ID)).toBe(false);
  });

  it('acepta la sesión que él mismo emitió y arma un perfil sin INNLAB', () => {
    const policy = new AuthBypassPolicy(true, SECRET);
    const { token, accessToken } = policy.issue();

    expect(token).toBe('');
    expect(policy.authenticate(accessToken)).toMatchObject({
      id: BYPASS_USER_ID,
    });
    expect(policy.profile().user).toMatchObject({
      id: BYPASS_USER_ID,
      email: 'lider.prueba@innlab.local',
    });
    expect(policy.profile().core.companyId).toBeNull();
  });

  it('rechaza un token firmado con otra clave', () => {
    const issued = new AuthBypassPolicy(true, SECRET).issue().accessToken;

    expect(
      new AuthBypassPolicy(true, 'otra-clave').authenticate(issued),
    ).toBeNull();
  });
});

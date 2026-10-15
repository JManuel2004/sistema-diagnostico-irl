import { describe, expect, it, jest } from '@jest/globals';
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

  it('no abre la puerta si el interruptor está apagado, aunque INNLAB no conteste', async () => {
    const off = new AuthBypassPolicy(false, SECRET);
    const probe = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);

    await expect(off.failsToRespondPromptly(probe)).resolves.toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it('sigue con INNLAB si alguna de las tres pruebas contesta a tiempo', async () => {
    const on = new AuthBypassPolicy(true, SECRET);
    const probe = jest
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(on.failsToRespondPromptly(probe)).resolves.toBe(false);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('deja entrar solo cuando las tres pruebas se quedan sin respuesta', async () => {
    const on = new AuthBypassPolicy(true, SECRET);
    const probe = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);

    await expect(on.failsToRespondPromptly(probe)).resolves.toBe(true);
    expect(probe).toHaveBeenCalledTimes(3);
  });

  it('rechaza un token firmado con otra clave', () => {
    const issued = new AuthBypassPolicy(true, SECRET).issue().accessToken;

    expect(
      new AuthBypassPolicy(true, 'otra-clave').authenticate(issued),
    ).toBeNull();
  });
});

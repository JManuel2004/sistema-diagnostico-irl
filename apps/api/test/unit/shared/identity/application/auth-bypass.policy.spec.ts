import { describe, expect, it } from '@jest/globals';
import { AuthBypassPolicy } from '../../../../../src/shared/identity/application/auth-bypass.policy.js';
import { BYPASS_PARTICIPANTS } from '../../../../../src/shared/identity/domain/bypass-identity.js';

const SECRET = 'test-secret';
const LAURA = BYPASS_PARTICIPANTS[0];
const ANDRES = BYPASS_PARTICIPANTS[1];
const CAMILA = BYPASS_PARTICIPANTS[2];

describe('AuthBypassPolicy', () => {
  it('rechaza cualquier token mientras el interruptor está apagado', () => {
    const off = new AuthBypassPolicy(false, SECRET);
    const on = new AuthBypassPolicy(true, SECRET);

    const issued = on.issue(LAURA.id);
    expect(issued).not.toBeNull();

    expect(off.authenticate(issued?.accessToken)).toBeNull();
    expect(off.isBypassUser(LAURA.id)).toBe(false);
    expect(off.participants()).toHaveLength(0);
    expect(off.issue(LAURA.id)).toBeNull();
  });

  it('acepta la sesión de cada persona y no llama a INNLAB para el perfil', () => {
    const policy = new AuthBypassPolicy(true, SECRET);

    expect(policy.participants()).toHaveLength(5);

    const laura = policy.issue(LAURA.id);
    const andres = policy.issue(ANDRES.id);
    expect(laura?.token).toBe('');
    expect(policy.authenticate(laura?.accessToken)).toMatchObject({
      id: LAURA.id,
      email: 'lider.agro@demo.innlab.local',
    });
    expect(policy.authenticate(andres?.accessToken)?.id).toBe(ANDRES.id);
    expect(policy.profile(LAURA.id)?.core.companyId).toBe(LAURA.company?.id);
    expect(policy.profile(CAMILA.id)?.core.companyId).toBeNull();
    expect(policy.issue('b1a55e55-0000-4000-8000-000000000099')).toBeNull();
  });

  it('rechaza un token firmado con otra clave', () => {
    const issued = new AuthBypassPolicy(true, SECRET).issue(LAURA.id);

    expect(
      new AuthBypassPolicy(true, 'otra-clave').authenticate(issued?.accessToken),
    ).toBeNull();
  });
});

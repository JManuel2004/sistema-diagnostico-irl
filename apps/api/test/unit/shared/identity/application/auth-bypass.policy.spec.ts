import { describe, expect, it } from '@jest/globals';
import { AuthBypassPolicy } from '../../../../../src/shared/identity/application/auth-bypass.policy.js';
import { BYPASS_PARTICIPANTS } from '../../../../../src/shared/identity/domain/bypass-identity.js';

const SECRET = 'test-secret';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

describe('AuthBypassPolicy', () => {
  const on = new AuthBypassPolicy(true, SECRET);
  const off = new AuthBypassPolicy(false, SECRET);

  it.each(BYPASS_PARTICIPANTS)(
    'abre la sesión de $firstName al elegir su tarjeta',
    (person) => {
      const session = on.issue(person.id);

      expect(session?.token).toBe('');
      expect(on.authenticate(session?.accessToken)).toMatchObject({
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
      });
      expect(on.profile(person.id)?.user.email).toBe(person.email);
      expect(on.profile(person.id)?.core.companyId).toBe(person.company?.id ?? null);
      expect(on.roster().map((card) => card.email)).toContain(person.email);
    },
  );

  it('no abre una sesión para un id que no está en las tarjetas', () => {
    expect(on.issue('b1a55e55-0000-4000-8000-000000000099')).toBeNull();
    expect(on.issue('')).toBeNull();
  });

  it('no publica las tarjetas ni abre sesión cuando el interruptor está apagado', () => {
    const laura = BYPASS_PARTICIPANTS[0];
    const issued = on.issue(laura.id);

    expect(off.roster()).toEqual([]);
    expect(off.issue(laura.id)).toBeNull();
    expect(off.authenticate(issued?.accessToken)).toBeNull();
    expect(off.isBypassUser(laura.id)).toBe(false);
    expect(off.profile(laura.id)).toBeNull();
  });

  it('rechaza un token firmado con otra clave, vencido o alterado', () => {
    const laura = BYPASS_PARTICIPANTS[0];
    const issued = on.issue(laura.id);
    const expired = on.issue(laura.id, Date.now() - TWELVE_HOURS_MS - 1000);
    const otherKey = new AuthBypassPolicy(true, 'otra-clave');

    expect(otherKey.authenticate(issued?.accessToken)).toBeNull();
    expect(on.authenticate(expired?.accessToken)).toBeNull();
    expect(on.authenticate(`${issued?.accessToken ?? ''}x`)).toBeNull();
    expect(on.authenticate(undefined)).toBeNull();
    expect(on.authenticate('')).toBeNull();
  });

  it('separa los diagnósticos: el token de una persona no es el de otra', () => {
    const [laura, andres] = BYPASS_PARTICIPANTS;
    const lauraToken = on.issue(laura.id)?.accessToken;
    const andresToken = on.issue(andres.id)?.accessToken;

    expect(on.authenticate(lauraToken)?.id).toBe(laura.id);
    expect(on.authenticate(andresToken)?.id).toBe(andres.id);
    expect(on.authenticate(lauraToken)?.id).not.toBe(andres.id);
  });

  it('nombra la empresa en la tarjeta y deja vacía la de quien no tiene', () => {
    const cards = on.roster();
    const camila = cards.find((card) => card.firstName === 'Camila');

    expect(cards.find((card) => card.firstName === 'Laura')?.companyName).toBe(
      'AgroConecta (demo)',
    );
    expect(camila?.companyName).toBeNull();
  });
});

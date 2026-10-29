import { describe, expect, it } from '@jest/globals';
import { AuthBypassPolicy } from '../../../../../src/shared/identity/application/auth-bypass.policy.js';
import { BYPASS_PARTICIPANTS } from '../../../../../src/shared/identity/domain/bypass-identity.js';

const SECRET = 'test-secret';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

describe('AuthBypassPolicy', () => {
  const on = new AuthBypassPolicy(true, SECRET);
  const off = new AuthBypassPolicy(false, SECRET);

  it.each(BYPASS_PARTICIPANTS)(
    'abre la sesión de $firstName con su correo y su contraseña',
    (person) => {
      const session = on.login(person.email, person.password);

      expect(session?.token).toBe('');
      expect(on.authenticate(session?.accessToken)).toMatchObject({
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
      });
      expect(on.profile(person.id)?.user.email).toBe(person.email);
      expect(on.profile(person.id)?.core.companyId).toBe(person.company?.id ?? null);
      expect(JSON.stringify(on.profile(person.id))).not.toContain(person.password);
    },
  );

  it.each(BYPASS_PARTICIPANTS)(
    'rechaza a $firstName si la contraseña es de otra persona',
    (person) => {
      const foreign = BYPASS_PARTICIPANTS.find((other) => other.id !== person.id);
      expect(foreign).toBeDefined();
      expect(on.login(person.email, foreign?.password ?? '')).toBeNull();
      expect(on.login(person.email, 'no-es-la-clave')).toBeNull();
      expect(on.login(person.email, '')).toBeNull();
    },
  );

  it('acepta el correo con mayúsculas y espacios', () => {
    const laura = BYPASS_PARTICIPANTS[0];
    const session = on.login(`  ${laura.email.toUpperCase()}  `, laura.password);

    expect(on.authenticate(session?.accessToken)?.id).toBe(laura.id);
  });

  it('no dice si falló el correo o la contraseña', () => {
    const laura = BYPASS_PARTICIPANTS[0];

    expect(on.login('nadie@demo.innlab.local', laura.password)).toBeNull();
    expect(on.login(laura.email, 'Agro-2026 ')).toBeNull();
  });

  it('no abre sesión ni acepta un token ya emitido cuando el interruptor está apagado', () => {
    const laura = BYPASS_PARTICIPANTS[0];
    const issued = on.login(laura.email, laura.password);

    expect(off.login(laura.email, laura.password)).toBeNull();
    expect(off.authenticate(issued?.accessToken)).toBeNull();
    expect(off.isBypassUser(laura.id)).toBe(false);
    expect(off.profile(laura.id)).toBeNull();
  });

  it('rechaza un token firmado con otra clave, vencido o alterado', () => {
    const laura = BYPASS_PARTICIPANTS[0];
    const issued = on.login(laura.email, laura.password);
    const expired = on.login(laura.email, laura.password, Date.now() - TWELVE_HOURS_MS - 1000);
    const otherKey = new AuthBypassPolicy(true, 'otra-clave');

    expect(otherKey.authenticate(issued?.accessToken)).toBeNull();
    expect(on.authenticate(expired?.accessToken)).toBeNull();
    expect(on.authenticate(`${issued?.accessToken ?? ''}x`)).toBeNull();
    expect(on.authenticate(undefined)).toBeNull();
    expect(on.authenticate('')).toBeNull();
  });

  it('separa los diagnósticos: el token de una persona no es el de otra', () => {
    const [laura, andres] = BYPASS_PARTICIPANTS;
    const lauraToken = on.login(laura.email, laura.password)?.accessToken;
    const andresToken = on.login(andres.email, andres.password)?.accessToken;

    expect(on.authenticate(lauraToken)?.id).toBe(laura.id);
    expect(on.authenticate(andresToken)?.id).toBe(andres.id);
    expect(on.authenticate(lauraToken)?.id).not.toBe(andres.id);
  });
});

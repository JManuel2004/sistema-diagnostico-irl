import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AuthBypassController } from '../../../../../src/shared/identity/presentation/controllers/auth-bypass.controller.js';
import { AuthBypassPolicy } from '../../../../../src/shared/identity/application/auth-bypass.policy.js';
import { BYPASS_PARTICIPANTS } from '../../../../../src/shared/identity/domain/bypass-identity.js';

const SECRET = 'test-secret';

describe('AuthBypassController', () => {
  const on = new AuthBypassController(new AuthBypassPolicy(true, SECRET));
  const off = new AuthBypassController(new AuthBypassPolicy(false, SECRET));

  it('no publica contraseñas ni la lista de personas', () => {
    const body = JSON.stringify(on.mode());

    expect(on.mode()).toEqual({ bypass: true });
    expect(off.mode()).toEqual({ bypass: false });
    for (const person of BYPASS_PARTICIPANTS) {
      expect(body).not.toContain(person.password);
      expect(body).not.toContain(person.email);
    }
  });

  it.each(BYPASS_PARTICIPANTS)(
    'entra a $firstName y rechaza la misma clave en otro correo',
    (person) => {
      const session = on.open({ email: person.email, password: person.password });
      const other = BYPASS_PARTICIPANTS.find((candidate) => candidate.id !== person.id);

      expect(session.accessToken.length).toBeGreaterThan(0);
      expect(() =>
        on.open({ email: other?.email ?? '', password: person.password }),
      ).toThrow(BadRequestException);
    },
  );

  it('responde 404 con la clave correcta cuando el interruptor está apagado', () => {
    const laura = BYPASS_PARTICIPANTS[0];

    expect(() => off.open({ email: laura.email, password: laura.password })).toThrow(
      NotFoundException,
    );
  });
});

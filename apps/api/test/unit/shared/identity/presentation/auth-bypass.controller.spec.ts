import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AuthBypassController } from '../../../../../src/shared/identity/presentation/controllers/auth-bypass.controller.js';
import { AuthBypassPolicy } from '../../../../../src/shared/identity/application/auth-bypass.policy.js';
import { BYPASS_PARTICIPANTS } from '../../../../../src/shared/identity/domain/bypass-identity.js';

const SECRET = 'test-secret';

describe('AuthBypassController', () => {
  const on = new AuthBypassController(new AuthBypassPolicy(true, SECRET));
  const off = new AuthBypassController(new AuthBypassPolicy(false, SECRET));

  it('publica las tarjetas solo mientras el interruptor está encendido', () => {
    const openDoor = on.mode();
    const closedDoor = JSON.stringify(off.mode());

    expect(openDoor.bypass).toBe(true);
    expect(openDoor.participants).toHaveLength(BYPASS_PARTICIPANTS.length);
    expect(openDoor.participants.map((card) => card.email)).toEqual(
      BYPASS_PARTICIPANTS.map((person) => person.email),
    );
    expect(JSON.stringify(openDoor)).not.toContain('password');
    expect(off.mode()).toEqual({ bypass: false, participants: [] });
    for (const person of BYPASS_PARTICIPANTS) {
      expect(closedDoor).not.toContain(person.email);
    }
  });

  it.each(BYPASS_PARTICIPANTS)('entra a $firstName al elegir su tarjeta', (person) => {
    const session = on.open({ userId: person.id });

    expect(session.accessToken.length).toBeGreaterThan(0);
    expect(session.token).toBe('');
  });

  it('rechaza un id que no es una tarjeta', () => {
    expect(() => on.open({ userId: 'b1a55e55-0000-4000-8000-000000000099' })).toThrow(
      BadRequestException,
    );
  });

  it('responde 404 aunque el id sea de una tarjeta cuando el interruptor está apagado', () => {
    const laura = BYPASS_PARTICIPANTS[0];

    expect(() => off.open({ userId: laura.id })).toThrow(NotFoundException);
  });
});

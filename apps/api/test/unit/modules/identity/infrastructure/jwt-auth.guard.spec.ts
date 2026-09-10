 
import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../../../src/modules/identity/infrastructure/guards/jwt-auth.guard.js';

const executionContext = {
  getHandler: () => undefined,
  getClass: () => undefined,
} as unknown as ExecutionContext;

/**
 * `AuthGuard('jwt')` builds a mixin class; `JwtAuthGuard.prototype`'s
 * prototype is where its `canActivate` lives. Stubbing it there is what
 * lets these tests distinguish "short-circuited as public" from
 * "handed over to passport" without a real strategy or JWKS endpoint.
 */
const passportGuardPrototype = Object.getPrototypeOf(
  JwtAuthGuard.prototype,
) as { canActivate: (context: ExecutionContext) => boolean };

function guardWithPublicFlag(isPublic: boolean | undefined): {
  guard: JwtAuthGuard;
  reflector: Reflector;
} {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
  return { guard: new JwtAuthGuard(reflector), reflector };
}

describe('JwtAuthGuard', () => {
  let delegate: jest.SpiedFunction<(context: ExecutionContext) => boolean>;

  beforeEach(() => {
    delegate = jest
      .spyOn(passportGuardPrototype, 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    delegate.mockRestore();
  });

  it('lets a @Public() route through without invoking passport', () => {
    const { guard } = guardWithPublicFlag(true);

    expect(guard.canActivate(executionContext)).toBe(true);
    expect(delegate).not.toHaveBeenCalled();
  });

  it('hands an unmarked route to the jwt strategy', () => {
    const { guard, reflector } = guardWithPublicFlag(undefined);

    const result = guard.canActivate(executionContext);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalled();
    expect(delegate).toHaveBeenCalledTimes(1);
  });
});

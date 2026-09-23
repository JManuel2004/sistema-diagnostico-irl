import type { FactoryProvider, InjectionToken } from '@nestjs/common';

/**
 * Binds an `application/` class (use case or query) to Nest without
 * decorating it: `application/` stays free of framework imports, and the
 * module lists what the constructor receives, in order.
 */
export function applicationProvider<T>(
  useCase: new (...deps: never[]) => T,
  inject: readonly InjectionToken[],
): FactoryProvider<T> {
  return {
    provide: useCase,
    useFactory: (...deps: unknown[]) => new useCase(...(deps as never[])),
    inject: [...inject],
  };
}

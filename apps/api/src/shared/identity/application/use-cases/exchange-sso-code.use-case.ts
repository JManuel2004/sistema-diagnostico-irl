import type { CoreSession } from '@innlab/contracts';
import type { SsoExchangePort } from '../ports/sso-exchange.port.js';

/** Exchanges the Hub's one-time code for the INNLAB session. */
export class ExchangeSsoCodeUseCase {
  constructor(private readonly core: SsoExchangePort) {}

  execute(code: string): Promise<CoreSession> {
    return this.core.exchange(code);
  }
}

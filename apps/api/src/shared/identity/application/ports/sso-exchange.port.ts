import type { CoreSession } from '@innlab/contracts';

/**
 * Asks INNLAB Core to turn a one-time SSO code into a session.
 *
 * The browser must not call Core for this: Core only allows a fixed list
 * of origins, and the deployed site is not on it. The API calls Core
 * server to server and returns the session to the page.
 */
export interface SsoExchangePort {
  exchange(code: string): Promise<CoreSession>;
}

export const SSO_EXCHANGE_PORT = Symbol('SSO_EXCHANGE_PORT');

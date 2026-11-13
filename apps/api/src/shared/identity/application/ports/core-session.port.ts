/**
 * Session calls the browser used to make straight to INNLAB Core.
 *
 * Core does not allow the deployed site's origin, so the API makes them
 * server to server. `null` from `introspect` means Core did not give a
 * yes or a no: the caller must keep the session.
 */
export interface CoreSessionPort {
  introspect(accessToken: string): Promise<boolean | null>;
  logout(accessToken: string): Promise<void>;
}

export const CORE_SESSION_PORT = Symbol('CORE_SESSION_PORT');

/**
 * Asks whether INNLAB's auth answers promptly.
 *
 * A prompt answer is any HTTP response. A timeout or a connection failure
 * is not: the service did not answer in time. The boolean is the only
 * thing the rest of the API needs.
 */
export interface AuthProbePort {
  respondsPromptly(): Promise<boolean>;
}

export const AUTH_PROBE_PORT = Symbol('AUTH_PROBE_PORT');

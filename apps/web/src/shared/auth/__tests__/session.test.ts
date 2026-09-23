import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  consumeReturnTo,
  getAccessToken,
  hasStoredSession,
  readSession,
  redirectToSso,
  saveSession,
} from '../session';

const SESSION = { token: 'id-token-abc', accessToken: 'access-token-xyz' };

describe('sesión del ecosistema', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('no reporta sesión cuando no hay nada guardado', () => {
    expect(hasStoredSession()).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it('persiste y recupera ambos tokens', () => {
    saveSession(SESSION);

    expect(readSession()).toEqual(SESSION);
    expect(hasStoredSession()).toBe(true);
  });

  it('expone el accessToken y no el id_token como credencial', () => {
    saveSession(SESSION);

    // The id_token does not authenticate: Core requires token_use === 'access'.
    expect(getAccessToken()).toBe('access-token-xyz');
    expect(getAccessToken()).not.toBe('id-token-abc');
  });

  it('descarta una sesión guardada sin accessToken', () => {
    window.localStorage.setItem('innlab.session.v1', JSON.stringify({ token: 'solo-id' }));

    expect(readSession()).toBeNull();
    expect(hasStoredSession()).toBe(false);
  });

  // The storage can be edited outside the application: whatever does not
  // satisfy the contract is «no session», never half a session.
  it.each([
    ['accessToken que no es texto', { token: 'id', accessToken: 42 }],
    ['accessToken vacío', { token: 'id', accessToken: '' }],
    ['token que no es texto', { token: { x: 1 }, accessToken: 'access' }],
    ['un valor que no es un objeto', 'una-cadena'],
    ['null', null],
    ['un arreglo', ['access']],
  ])('descarta una sesión guardada con %s', (_case, value) => {
    window.localStorage.setItem('innlab.session.v1', JSON.stringify(value));

    expect(readSession()).toBeNull();
    expect(hasStoredSession()).toBe(false);
  });

  it('acepta una sesión sin id_token y lo toma como cadena vacía', () => {
    window.localStorage.setItem(
      'innlab.session.v1',
      JSON.stringify({ accessToken: 'access-token-xyz' }),
    );

    expect(readSession()).toEqual({ token: '', accessToken: 'access-token-xyz' });
  });

  it('ignora campos que no son del contrato', () => {
    window.localStorage.setItem(
      'innlab.session.v1',
      JSON.stringify({ ...SESSION, isAdmin: true }),
    );

    expect(readSession()).toEqual(SESSION);
  });

  it('sobrevive a un localStorage con JSON corrupto', () => {
    window.localStorage.setItem('innlab.session.v1', 'no-es-json');

    expect(readSession()).toBeNull();
  });

  it('olvida la sesión al cerrarla', () => {
    saveSession(SESSION);
    clearSession();

    expect(hasStoredSession()).toBe(false);
  });

  it('manda al Hub con la url de callback como redirect', () => {
    vi.stubEnv('VITE_CORE_URL', 'https://hub.test');
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173', pathname: '/', search: '' },
      writable: true,
    });
    Object.defineProperty(window.location, 'href', { set: assign, configurable: true });

    redirectToSso('/diagnosticos/42/cuestionario');

    // Exact route on purpose: `/sso` (without `/auth`) does not exist in the
    // Hub's router and fails with a blank screen, with no network error. A
    // `toContain('/sso?redirect=')` would pass with the wrong route.
    const target = String(assign.mock.calls[0]?.[0]);
    expect(target).toBe(
      'https://hub.test/auth/sso?redirect=' +
        encodeURIComponent('http://localhost:5173/auth/callback'),
    );
  });

  it('recuerda y consume la ruta original una sola vez', () => {
    const assign = vi.fn();
    Object.defineProperty(window.location, 'href', { set: assign, configurable: true });

    redirectToSso('/diagnosticos/42/cuestionario');

    expect(consumeReturnTo()).toBe('/diagnosticos/42/cuestionario');
    expect(consumeReturnTo()).toBeNull();
  });
});

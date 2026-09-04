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

    // El id_token no autentica: Core exige token_use === 'access'.
    expect(getAccessToken()).toBe('access-token-xyz');
    expect(getAccessToken()).not.toBe('id-token-abc');
  });

  it('descarta una sesión guardada sin accessToken', () => {
    window.localStorage.setItem('innlab.session.v1', JSON.stringify({ token: 'solo-id' }));

    expect(readSession()).toBeNull();
    expect(hasStoredSession()).toBe(false);
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

    // Ruta exacta a proposito: `/sso` (sin `/auth`) no existe en el router
    // del Hub y falla con una pantalla en blanco, sin error de red. Un
    // `toContain('/sso?redirect=')` pasaria con la ruta mala.
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

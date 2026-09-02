import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSsoExchange } from '../useSsoExchange';
import { readSession } from '@/shared/auth/session';

const exchangeSsoCode = vi.hoisted(() => vi.fn());
vi.mock('../../api/core-auth.api', () => ({ exchangeSsoCode }));

const SESSION = { token: 'id-token-abc', accessToken: 'access-token-xyz' };

describe('useSsoExchange', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    exchangeSsoCode.mockReset();
  });

  it('canjea el código y persiste la sesión', async () => {
    exchangeSsoCode.mockResolvedValue(SESSION);

    const { result } = renderHook(() => useSsoExchange('code-123'));

    await waitFor(() => {
      expect(result.current.status).toBe('done');
    });
    expect(exchangeSsoCode).toHaveBeenCalledWith('code-123');
    expect(readSession()).toEqual(SESSION);
  });

  it('canjea el código una sola vez aunque el efecto se remonte', async () => {
    exchangeSsoCode.mockResolvedValue(SESSION);

    const { result, rerender } = renderHook(() => useSsoExchange('code-123'));
    rerender();
    rerender();

    await waitFor(() => {
      expect(result.current.status).toBe('done');
    });
    // El código es de un solo uso: un segundo canje fallaría contra Core.
    expect(exchangeSsoCode).toHaveBeenCalledTimes(1);
  });

  it('vuelve a la ruta recordada tras el canje', async () => {
    exchangeSsoCode.mockResolvedValue(SESSION);
    window.sessionStorage.setItem('innlab.session.return-to', '/diagnosticos/42/cuestionario');

    const { result } = renderHook(() => useSsoExchange('code-123'));

    await waitFor(() => {
      expect(result.current.returnTo).toBe('/diagnosticos/42/cuestionario');
    });
  });

  it('reporta error sin guardar sesión cuando el código ya expiró', async () => {
    exchangeSsoCode.mockRejectedValue(new Error('code expired'));

    const { result } = renderHook(() => useSsoExchange('code-vencido'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error).toBe('code expired');
    expect(readSession()).toBeNull();
  });

  it('falla de inmediato si la URL no traía código', async () => {
    const { result } = renderHook(() => useSsoExchange(null));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(exchangeSsoCode).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useActiveSection } from '../useActiveSection';

const IDS = ['perfil', 'roadmap', 'servicio'];
const tops: Record<string, number> = {};

function scrollTo(next: Record<string, number>, scrollY = 400): void {
  Object.assign(tops, next);
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

beforeEach(() => {
  // One frame per scroll, run right away.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 1;
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 10_000,
  });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  for (const [index, id] of IDS.entries()) {
    const section = document.createElement('section');
    section.id = id;
    section.style.scrollMarginTop = '160px';
    section.getBoundingClientRect = () => ({ top: tops[id] ?? 0 }) as DOMRect;
    tops[id] = 200 + index * 1000;
    document.body.appendChild(section);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useActiveSection', () => {
  it('antes de llegar a ninguna sección, marca la primera', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    expect(result.current).toBe('perfil');
  });

  it('marca la última sección que llegó bajo la barra fija al desplazarse', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    scrollTo({ perfil: -800, roadmap: 160, servicio: 1200 });
    expect(result.current).toBe('roadmap');

    scrollTo({ perfil: -900, roadmap: 60, servicio: 170 });
    expect(result.current).toBe('roadmap');
  });

  it('al final de la página marca la última, aunque sea corta y no llegue arriba', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    scrollTo({ perfil: -2000, roadmap: -500, servicio: 400 }, 10_000 - window.innerHeight);
    expect(result.current).toBe('servicio');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DimensionCode } from '@innlab/contracts';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { RadarLegend } from '../RadarLegend';
import { useRadarHighlight } from '../../hooks/useRadarHighlight';
import { dotStyle, effectiveHighlight } from '../../utils/radar-helpers';

const CODES: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const RESULTS = CODES.map((c, i) => dimensionResultFixture(c, i + 3));

function legend(over: Partial<Parameters<typeof RadarLegend>[0]> = {}) {
  return render(
    <RadarLegend
      dimensionResults={RESULTS}
      highlighted={[]}
      pinned={null}
      onHover={vi.fn()}
      onPin={vi.fn()}
      {...over}
    />,
  );
}

describe('RadarLegend', () => {
  it('lists the six dimensions with their name and level, from the response', () => {
    legend();

    const items = screen.getAllByRole('button');
    expect(items).toHaveLength(6);
    expect(screen.getByRole('button', { name: /Tecnología/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /Financiación/ })).toHaveTextContent('8');
  });

  it("gives each dimension its color: the dimension's fill class from the tailwind palette", () => {
    const { container } = legend();

    for (const code of CODES) {
      expect(container.querySelector(`.bg-dimension-${code.toLowerCase()}`)).not.toBeNull();
    }
  });

  it('highlights a dimension on hover and clears it on leave', async () => {
    const user = userEvent.setup();
    const onHover = vi.fn();
    legend({ onHover });
    const item = screen.getByRole('button', { name: /Cliente/ });

    await user.hover(item);
    expect(onHover).toHaveBeenLastCalledWith(['CRL']);

    await user.unhover(item);
    expect(onHover).toHaveBeenLastCalledWith([]);
  });

  it('also highlights on keyboard focus', async () => {
    const user = userEvent.setup();
    const onHover = vi.fn();
    legend({ onHover });

    await user.tab();

    expect(onHover).toHaveBeenLastCalledWith(['TRL']);
  });

  it('pins a dimension on click and says so with aria-pressed', async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();
    legend({ onPin, pinned: 'BRL' });

    await user.click(screen.getByRole('button', { name: /Negocio/ }));

    expect(onPin).toHaveBeenCalledWith('BRL');
    expect(screen.getByRole('button', { name: /Negocio/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Cliente/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('effectiveHighlight', () => {
  it('has nothing highlighted by default', () => {
    expect(effectiveHighlight([], null)).toEqual([]);
  });

  it('highlights what is pinned when nothing is under the cursor', () => {
    expect(effectiveHighlight([], 'BRL')).toEqual(['BRL']);
  });

  it('lets what is under the cursor win over what is pinned', () => {
    expect(effectiveHighlight(['CRL', 'BRL'], 'TRL')).toEqual(['CRL', 'BRL']);
  });
});

describe('dotStyle', () => {
  it('enlarges and rings a highlighted point', () => {
    expect(dotStyle(true, true)).toEqual({ radius: 8, ringWidth: 3, opacity: 1 });
  });

  it('makes the rest recede while something is highlighted', () => {
    expect(dotStyle(false, true)).toEqual({ radius: 5, ringWidth: 0, opacity: 0.4 });
  });

  it('leaves every point as is when nothing is highlighted', () => {
    expect(dotStyle(false, false)).toEqual({ radius: 5, ringWidth: 0, opacity: 1 });
  });
});

describe('useRadarHighlight', () => {
  it('shares one highlight between the legend and the cards', () => {
    const { result } = renderHook(() => useRadarHighlight());
    expect(result.current.highlighted).toEqual([]);

    act(() => {
      result.current.setHovered(['IPRL']);
    });
    expect(result.current.highlighted).toEqual(['IPRL']);

    act(() => {
      result.current.setHovered([]);
    });
    expect(result.current.highlighted).toEqual([]);
  });

  it('keeps a pinned dimension after the cursor leaves, and releases it on a second click', () => {
    const { result } = renderHook(() => useRadarHighlight());

    act(() => {
      result.current.togglePinned('BRL');
    });
    expect(result.current.pinned).toBe('BRL');
    expect(result.current.highlighted).toEqual(['BRL']);

    act(() => {
      result.current.setHovered(['FRL']);
    });
    expect(result.current.highlighted).toEqual(['FRL']);

    act(() => {
      result.current.setHovered([]);
    });
    expect(result.current.highlighted).toEqual(['BRL']);

    act(() => {
      result.current.togglePinned('BRL');
    });
    expect(result.current.pinned).toBeNull();
    expect(result.current.highlighted).toEqual([]);
  });
});

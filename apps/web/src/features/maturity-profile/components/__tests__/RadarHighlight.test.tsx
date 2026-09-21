import { describe, expect, it } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { useRadarHighlight } from '../../hooks/useRadarHighlight';
import { DimensionTooltipContent } from '../DimensionTooltip';

describe('useRadarHighlight', () => {
  it('shares one highlight between the radar points and the cards', () => {
    const { result } = renderHook(() => useRadarHighlight());
    expect(result.current.highlighted).toEqual([]);

    act(() => {
      result.current.setHovered(['IPRL']);
    });
    expect(result.current.highlighted).toEqual(['IPRL']);

    act(() => {
      result.current.setHovered(['TRL', 'CRL']);
    });
    expect(result.current.highlighted).toEqual(['TRL', 'CRL']);

    act(() => {
      result.current.setHovered([]);
    });
    expect(result.current.highlighted).toEqual([]);
  });
});

// What the tooltip of a radar point says about its dimension.
describe('DimensionTooltipContent', () => {
  it('explains the dimension: its name, what it measures and the level of the initiative', () => {
    render(
      <DimensionTooltipContent
        code="CRL"
        name="Cliente"
        level={3}
        description="Qué tanto conoces, validas y haces tracción con tus clientes."
      />,
    );

    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(
      screen.getByText('Qué tanto conoces, validas y haces tracción con tus clientes.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Tu nivel: 3 de 9')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nivel 3 de 9' })).toBeInTheDocument();
  });

  it('still names the dimension and its level when the catalog description is not there', () => {
    render(<DimensionTooltipContent code="FRL" name="Financiación" level={7} />);

    expect(screen.getByText('Financiación')).toBeInTheDocument();
    expect(screen.getByText('Tu nivel: 7 de 9')).toBeInTheDocument();
  });
});

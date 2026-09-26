import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';
import { LevelBar } from '../level-bar';

function fills(container: HTMLElement, cls: string): number {
  return container.querySelectorAll(`.${cls}`).length;
}

describe('LevelBar', () => {
  it('pinta tantos tramos como el nivel, de nueve', () => {
    const { container } = render(<LevelBar level={4} fillClass="bg-dimension-trl" />);

    expect(container.querySelectorAll('span')).toHaveLength(9);
    expect(fills(container, 'bg-dimension-trl')).toBe(4);
  });

  it('lo dice también como texto, para quien no ve el color', () => {
    render(<LevelBar level={7} fillClass="bg-dimension-trl" />);

    expect(screen.getByRole('img', { name: 'Nivel 7 de 9' })).toBeInTheDocument();
  });

  it('pinta con tono suave el tramo que falta hasta la meta', () => {
    const { container } = render(
      <LevelBar level={3} targetLevel={6} fillClass="bg-dimension-brl" softClass="bg-dimension-brl/35" />,
    );

    expect(fills(container, 'bg-dimension-brl')).toBe(3);
    expect(container.querySelectorAll('[class*="bg-dimension-brl/35"]')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Nivel 3 de 9, con meta en el nivel 6' })).toBeInTheDocument();
  });

  it('marca con un anillo el último nivel que cuenta como brecha', () => {
    const { container } = render(
      <LevelBar level={2} fillClass="bg-critical" thresholdLevel={3} />,
    );

    expect(container.querySelectorAll('[class*="ring-1"]')).toHaveLength(1);
  });

  it('sirve para otras escalas, como el Likert de cinco', () => {
    const { container } = render(<LevelBar level={4} fillClass="bg-dimension-crl" segments={5} />);

    expect(container.querySelectorAll('span')).toHaveLength(5);
    expect(screen.getByRole('img', { name: 'Nivel 4 de 5' })).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it.each(['neutral', 'info', 'critical', 'moderate', 'acceptable'] as const)(
    'el tono %s lleva su texto',
    (tone) => {
      render(<Badge tone={tone}>Etiqueta</Badge>);

      expect(screen.getByText('Etiqueta')).toBeInTheDocument();
    },
  );

  it('no baja de text-sm', () => {
    render(<Badge>Etiqueta</Badge>);

    expect(screen.getByText('Etiqueta').className).toContain('text-sm');
  });
});

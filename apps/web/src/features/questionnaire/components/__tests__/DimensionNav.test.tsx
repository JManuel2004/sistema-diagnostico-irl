import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { DimensionNav } from '../DimensionNav';

type Item = QuestionnaireStructure['dimensions'][number];
const dim = (code: Item['code'], name: string, sequence: number): Item => ({
  code,
  name,
  description: 'd',
  sequence,
  statements: [],
});
const TRL = dim('TRL', 'Nivel de Madurez Tecnológica', 1);
const CRL = dim('CRL', 'Nivel de Madurez del Cliente', 2);
const FRL = dim('FRL', 'Nivel de Madurez de la Financiación', 6);

describe('DimensionNav — siguiente dimensión', () => {
  it('mientras falten respuestas, «Continuar con» es la acción principal', () => {
    render(<DimensionNav previousDimension={null} nextDimension={CRL} onNavigate={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Continuar con Nivel de Madurez del Cliente' }),
    ).toHaveClass('bg-primary');
  });

  it('con todo respondido pasa a secundaria: la principal es «Revisar resumen»', () => {
    render(
      <DimensionNav
        previousDimension={null}
        nextDimension={CRL}
        allComplete
        onNavigate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Continuar con Nivel de Madurez del Cliente' }),
    ).not.toHaveClass('bg-primary');
  });

  it('en la última dimensión lleva a la primera que tiene afirmaciones pendientes', async () => {
    const onNavigate = vi.fn();
    render(
      <DimensionNav
        previousDimension={dim('TmRL', 'Equipo', 5)}
        nextDimension={null}
        pendingDimension={TRL}
        onNavigate={onNavigate}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Continuar con Nivel de Madurez Tecnológica' }),
    );
    expect(onNavigate).toHaveBeenCalledWith('TRL');
  });

  it('en la última dimensión, con todo respondido, no ofrece avanzar', () => {
    render(<DimensionNav previousDimension={FRL} nextDimension={null} onNavigate={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /^Continuar con/ })).not.toBeInTheDocument();
  });
});

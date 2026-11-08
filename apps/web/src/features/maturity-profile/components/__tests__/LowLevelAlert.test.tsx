import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DimensionCode } from '@innlab/contracts';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { LowLevelAlert } from '../LowLevelAlert';

const RESULTS = [
  dimensionResultFixture('TRL', 5),
  dimensionResultFixture('CRL', 2),
  dimensionResultFixture('BRL', 3),
  dimensionResultFixture('IPRL', 4),
  dimensionResultFixture('TmRL', 4),
  dimensionResultFixture('FRL', 4),
];
const NEXT = { href: '#analisis-profundo', label: 'Ir al análisis profundo', text: 'Siguiente.' };

function renderAlert(low: DimensionCode[], critical: DimensionCode[] = []) {
  return render(
    <LowLevelAlert
      profile={{
        dimensionResults: RESULTS,
        gaps: { dimensions: low, threshold: 3 },
        criticalState: { dimensions: critical },
      }}
      nextStep={NEXT}
    />,
  );
}

describe('LowLevelAlert — niveles bajos', () => {
  it('dice cuántas dimensiones están abajo, cuáles, y lleva al siguiente paso', () => {
    renderAlert(['CRL', 'BRL'], ['CRL']);

    expect(
      screen.getByRole('heading', {
        name: '2 dimensiones de tu iniciativa están en nivel 3 o menos',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText(/frenan el avance del resto\. Siguiente\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al análisis profundo' })).toHaveAttribute(
      'href',
      '#analisis-profundo',
    );
  });

  it('en singular con una sola dimensión', () => {
    renderAlert(['CRL']);

    expect(screen.getByText(/Está muy al inicio y frena el avance del resto/)).toBeInTheDocument();
  });

  it('sin dimensiones abajo no aparece', () => {
    const { container } = renderAlert([]);

    expect(container).toBeEmptyDOMElement();
  });
});

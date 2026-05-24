import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { DimensionResult } from '@innlab/contracts';
import { MaturityProfileSummary } from '../MaturityProfileSummary';

const dr = (code: string, level: number): DimensionResult => ({
  dimensionCode: code as DimensionResult['dimensionCode'],
  name: code,
  averageLikert: level,
  irlLevel: level,
});

const SIX_RESULTS: readonly DimensionResult[] = [
  dr('TRL', 5),
  dr('CRL', 3),
  dr('BRL', 3),
  dr('IPRL', 2),
  dr('TmRL', 4),
  dr('FRL', 3),
];

describe('MaturityProfileSummary — bottleneck card (RF-08)', () => {
  describe('using server-provided bottleneck', () => {
    it('renders the bottleneck eyebrow label', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={SIX_RESULTS}
          bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        />,
      );
      expect(screen.getByText('Cuello de botella')).toBeInTheDocument();
    });

    it('shows the dimension name and level for a single bottleneck', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={SIX_RESULTS}
          bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        />,
      );
      expect(
        screen.getByText('Propiedad Intelectual — nivel 2'),
      ).toBeInTheDocument();
    });

    it('shows a tie summary title when multiple dimensions share the minimum', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={SIX_RESULTS}
          bottleneck={{ dimensions: ['CRL', 'BRL', 'FRL'], level: 3 }}
        />,
      );
      expect(
        screen.getByText('3 dimensiones empatadas en nivel 3'),
      ).toBeInTheDocument();
    });

    it('lists the tied dimension names when there is more than one bottleneck', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={SIX_RESULTS}
          bottleneck={{ dimensions: ['CRL', 'BRL', 'FRL'], level: 3 }}
        />,
      );
      expect(screen.getByText('Cliente, Negocio, Financiación')).toBeInTheDocument();
    });

    it('does not show a name list inside the bottleneck card when there is only one dimension', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={SIX_RESULTS}
          bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        />,
      );
      const card = screen.getByRole('group', {
        name: 'Cuello de botella: Propiedad Intelectual — nivel 2',
      });
      expect(within(card).queryByText('Propiedad Intelectual')).toBeNull();
    });
  });

  describe('fallback to client-derived bottleneck when server field is absent', () => {
    it('still renders the bottleneck card from dimensionResults alone', () => {
      render(<MaturityProfileSummary dimensionResults={SIX_RESULTS} />);
      expect(screen.getByText('Cuello de botella')).toBeInTheDocument();
      expect(
        screen.getByText('Propiedad Intelectual — nivel 2'),
      ).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders the empty placeholder and not the bottleneck card', () => {
      render(<MaturityProfileSummary dimensionResults={[]} />);
      expect(screen.getByText('Sin datos para resumir todavía.')).toBeInTheDocument();
      expect(screen.queryByText('Cuello de botella')).toBeNull();
    });
  });
});

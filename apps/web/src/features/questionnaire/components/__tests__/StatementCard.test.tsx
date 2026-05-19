import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Statement } from '@innlab/contracts';
import { StatementCard } from '../StatementCard';

const statement: Statement = {
  id: '1',
  dimensionCode: 'TRL',
  sequence: 3,
  text: 'Hemos validado experimentalmente componentes individuales.',
};

describe('StatementCard', () => {
  it('renders the statement text', () => {
    render(<StatementCard statement={statement} />);
    expect(
      screen.getByText('Hemos validado experimentalmente componentes individuales.'),
    ).toBeInTheDocument();
  });

  it('renders the position label "Afirmación X de 8"', () => {
    render(<StatementCard statement={statement} />);
    expect(screen.getByText('Afirmación 3 de 8')).toBeInTheDocument();
  });
});

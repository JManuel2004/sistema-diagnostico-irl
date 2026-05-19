import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionnaireSkeleton } from '../QuestionnaireSkeleton';

describe('QuestionnaireSkeleton', () => {
  it('renders a status region with aria-busy=true', () => {
    render(<QuestionnaireSkeleton />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-busy', 'true');
  });

  it('provides an accessible label so screen readers announce loading', () => {
    render(<QuestionnaireSkeleton />);
    expect(screen.getByLabelText('Cargando cuestionario')).toBeInTheDocument();
  });

  it('renders 8 placeholder rows (one per statement)', () => {
    const { container } = render(<QuestionnaireSkeleton />);
    const rows = container.querySelectorAll('.h-24');
    expect(rows).toHaveLength(8);
  });
});

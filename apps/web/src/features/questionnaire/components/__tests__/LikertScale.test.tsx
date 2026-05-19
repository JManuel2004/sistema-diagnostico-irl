import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LikertValue } from '@innlab/contracts';
import { LikertScale } from '../LikertScale';

function renderHarness(initialValue: LikertValue | null = 1) {
  function Harness() {
    const [value, setValue] = useState<LikertValue | null>(initialValue);

    return (
      <>
        <p id="statement-1">Existe una descripción documentada del concepto técnico.</p>
        <LikertScale id="statement-1" value={value} onChange={setValue} />
      </>
    );
  }

  return render(<Harness />);
}

describe('LikertScale', () => {
  it('renders five selectable options and ties the group to the statement text', () => {
    renderHarness();

    expect(
      screen.getByRole('radiogroup', {
        name: 'Existe una descripción documentada del concepto técnico.',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Totalmente en desacuerdo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Totalmente de acuerdo' })).toBeInTheDocument();
  });

  it('updates the highlighted option when a different value is selected', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('radio', { name: 'En desacuerdo' }));
    expect(screen.getByRole('radio', { name: 'En desacuerdo' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'De acuerdo' }));
    expect(screen.getByRole('radio', { name: 'De acuerdo' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'En desacuerdo' })).not.toBeChecked();
  });

  it('supports keyboard navigation with tab and arrow keys', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Totalmente en desacuerdo' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'En desacuerdo' })).toHaveFocus();
  });
});

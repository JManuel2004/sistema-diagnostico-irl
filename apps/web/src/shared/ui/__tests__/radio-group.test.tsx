import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioGroup, RadioGroupItem } from '../radio-group';

describe('RadioGroup (shared/ui)', () => {
  function renderSample(onChange: (v: string) => void = () => undefined): void {
    render(
      <RadioGroup aria-label="Escala Likert" onValueChange={onChange}>
        {[1, 2, 3, 4, 5].map((n) => (
          <RadioGroupItem key={n} value={String(n)} aria-label={`Opción ${n}`} />
        ))}
      </RadioGroup>,
    );
  }

  it('renderiza 5 ítems con role="radio" y el contenedor con role="radiogroup"', () => {
    renderSample();
    expect(screen.getByRole('radiogroup', { name: 'Escala Likert' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('emite onValueChange con el valor seleccionado', async () => {
    const onChange = vi.fn();
    renderSample(onChange);
    await userEvent.click(screen.getByRole('radio', { name: 'Opción 3' }));
    expect(onChange).toHaveBeenCalledWith('3');
  });
});

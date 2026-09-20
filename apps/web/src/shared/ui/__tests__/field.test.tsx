import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field, Input, Select, Textarea } from '../field';

describe('Field', () => {
  it('ties the label to the control', () => {
    render(<Field label="Nombre">{(c) => <Input {...c} />}</Field>);

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('describes the control with its hint', () => {
    render(
      <Field label="Equipo" hint="Quiénes son">
        {(c) => <Textarea {...c} />}
      </Field>,
    );

    expect(screen.getByLabelText('Equipo')).toHaveAccessibleDescription('Quiénes son');
  });

  it('marks the control invalid and shows the error, which is also its description', () => {
    render(
      <Field label="Sector" error="Elige un sector">
        {(c) => (
          <Select {...c}>
            <option value="">—</option>
          </Select>
        )}
      </Field>,
    );

    const control = screen.getByLabelText('Sector');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription('Elige un sector');
    expect(control).toHaveClass('border-critical');
    expect(screen.getByText('Elige un sector')).toBeInTheDocument();
  });

  it('is not invalid without an error', () => {
    render(<Field label="Nombre">{(c) => <Input {...c} />}</Field>);

    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'false');
  });
});

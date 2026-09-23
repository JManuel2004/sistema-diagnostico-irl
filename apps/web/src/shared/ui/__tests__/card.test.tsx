import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardContent } from '../card';

describe('Card (shared/ui)', () => {
  it('renderiza el contenido dentro de la tarjeta', () => {
    render(
      <Card>
        <CardContent>Cuerpo de la tarjeta</CardContent>
      </Card>,
    );
    expect(screen.getByText('Cuerpo de la tarjeta')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../card';

describe('Card (shared/ui)', () => {
  it('renderiza la composición completa y respeta el rol semántico del title', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico activo</CardTitle>
        </CardHeader>
        <CardContent>Cuerpo de la tarjeta</CardContent>
        <CardFooter>
          <span>Pie de la tarjeta</span>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Diagnóstico activo' })).toBeInTheDocument();
    expect(screen.getByText('Cuerpo de la tarjeta')).toBeInTheDocument();
    expect(screen.getByText('Pie de la tarjeta')).toBeInTheDocument();
  });
});

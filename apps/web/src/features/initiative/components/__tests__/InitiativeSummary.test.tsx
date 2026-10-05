import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { initiativeFixture } from '@/test/fixtures/initiative';
import { InitiativeSummary } from '../InitiativeSummary';

describe('InitiativeSummary', () => {
  it('abre con el nombre de la iniciativa y su sector como insignia', () => {
    render(<InitiativeSummary initiative={initiativeFixture()} />);

    expect(screen.getByRole('heading', { name: 'AgroConecta' })).toBeInTheDocument();
    expect(screen.getByText('Agroindustria / AgriTech')).toBeInTheDocument();
  });

  it('muestra cada dato con su nombre, en bloques legibles', () => {
    render(<InitiativeSummary initiative={initiativeFixture()} />);

    for (const [label, value] of [
      ['Qué ofrece', /Aplicación web y módulo de trazabilidad/],
      ['Etapa', /Validación — Piloto completado/],
      ['Equipo', /3 personas — Fundadora, coordinadora/],
      ['Mercado objetivo', /Productores de café del suroccidente/],
      ['Financiamiento actual', /Ahorros de la fundadora/],
    ] as const) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it('dice «persona» en singular para un equipo de una', () => {
    render(<InitiativeSummary initiative={initiativeFixture({ teamSize: 1 })} />);

    expect(screen.getByText(/1 persona — /)).toBeInTheDocument();
  });

  it('deja lugar a una acción junto al nombre', () => {
    render(
      <InitiativeSummary initiative={initiativeFixture()} action={<a href="/x">Corregir</a>} />,
    );

    expect(screen.getByRole('link', { name: 'Corregir' })).toBeInTheDocument();
  });

  it('se lee a tamaño de lectura: sin texto de nota ni sobretítulos diminutos', () => {
    const { container } = render(<InitiativeSummary initiative={initiativeFixture()} />);

    expect(container.innerHTML).not.toContain('text-xs');
    expect(container.innerHTML).not.toContain('text-overline');
  });
});

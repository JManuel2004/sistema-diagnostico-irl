import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DimensionCode } from '@innlab/contracts';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { formatOneDecimal } from '@/shared/lib/format';
import { ProfileHero } from '../ProfileHero';

const CODES: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
// AgroConecta: TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2 → global average 3.5.
const LEVELS: Record<DimensionCode, number> = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 };

function hero(over: Partial<Parameters<typeof ProfileHero>[0]> = {}) {
  return render(
    <ProfileHero
      initiativeName="AgroConecta"
      description="Aplicación web y módulo de trazabilidad para cooperativas cafeteras"
      sectorName="Agroindustria / AgriTech"
      stageName="Validación"
      globalAverage={3.5}
      dimensionResults={CODES.map((c) => dimensionResultFixture(c, LEVELS[c]))}
      strength={{ dimensions: ['TRL'], level: 6 }}
      bottleneck={{ dimensions: ['IPRL'], level: 1 }}
      {...over}
    >
      <p>Resultado guardado el 20 de septiembre</p>
    </ProfileHero>,
  );
}

describe('ProfileHero — el perfil es de una iniciativa', () => {
  it('abre con el nombre de la iniciativa como título de la página', () => {
    hero();

    expect(screen.getByRole('heading', { level: 1, name: 'AgroConecta' })).toBeInTheDocument();
  });

  it('muestra una descripción breve y el sector como insignia', () => {
    hero();

    expect(screen.getByText(/Aplicación web y módulo de trazabilidad/)).toBeInTheDocument();
    expect(screen.getByText('Agroindustria / AgriTech')).toBeInTheDocument();
    expect(screen.getByText('Etapa: Validación')).toBeInTheDocument();
  });

  it('deja lugar para la fecha en que se guardó el resultado', () => {
    hero();

    expect(screen.getByText('Resultado guardado el 20 de septiembre')).toBeInTheDocument();
  });

  it('sin el nombre todavía, habla de «tu iniciativa»', () => {
    hero({
      initiativeName: undefined,
      description: undefined,
      sectorName: undefined,
      stageName: undefined,
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Tu iniciativa' })).toBeInTheDocument();
  });

  describe('el nivel IRL global', () => {
    it('muestra el promedio de las seis dimensiones sobre 9, calculado por el backend', () => {
      hero();

      const card = screen.getByText('Nivel IRL global').closest('div') as HTMLElement;
      expect(card).toHaveTextContent('3,5');
      expect(card).toHaveTextContent('de 9');
      expect(screen.getByRole('img', { name: 'Nivel 4 de 9' })).toBeInTheDocument();
    });

    it('explica qué es en una frase', () => {
      hero();

      expect(screen.getByText(/promedio de tus seis dimensiones/i)).toBeInTheDocument();
    });

    it('nombra lo más fuerte y lo más débil con sus niveles', () => {
      hero();

      const strong = screen.getByText('Más fuerte').closest('div') as HTMLElement;
      expect(strong).toHaveTextContent('Tecnología');
      expect(strong).toHaveTextContent('Nivel 6');
      const weak = screen.getByText('Más débil').closest('div') as HTMLElement;
      expect(weak).toHaveTextContent('Propiedad Intelectual');
      expect(weak).toHaveTextContent('Nivel 1');
    });

    it('marca lo más débil en el tono moderado, no en el rojo de emergencia', () => {
      hero();
      const label = screen.getByText('Más débil').closest('dt')!;
      expect(label).toHaveClass('text-moderate');
      expect(label).not.toHaveClass('text-critical');
    });

    it('nombra todas las dimensiones empatadas', () => {
      hero({ bottleneck: { dimensions: ['BRL', 'FRL'], level: 2 } });

      const weak = screen.getByText('Más débil').closest('div') as HTMLElement;
      expect(weak).toHaveTextContent('Negocio, Financiación');
    });

    it('explica «más débil» y «más fuerte» al pasar el cursor', async () => {
      const user = userEvent.setup();
      hero();

      await user.hover(screen.getByRole('button', { name: 'Más débil' }));

      expect((await screen.findAllByText(/menos avanzada/i)).length).toBeGreaterThan(0);
    });

    it('no inventa una etiqueta de estado del nivel: solo lo que el backend calcula', () => {
      hero();

      expect(screen.queryByText(/en progreso|validación inicial/i)).not.toBeInTheDocument();
    });
  });

  it('el texto de lectura no baja de text-sm', () => {
    const { container } = hero();

    expect(container.innerHTML).not.toContain('text-xs');
    expect(within(container).queryByText(/[→≤]/)).not.toBeInTheDocument();
  });
});

describe('formatOneDecimal', () => {
  it.each([
    [3.5, '3,5'],
    [4, '4'],
    [1.2, '1,2'],
    [8.8, '8,8'],
    [9, '9'],
  ])('%s se muestra como %s', (value, expected) => {
    expect(formatOneDecimal(value)).toBe(expected);
  });
});

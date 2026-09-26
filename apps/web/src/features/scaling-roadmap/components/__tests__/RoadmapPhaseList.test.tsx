import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { dimensionRefFixture } from '@/test/fixtures/dimensions';
import { agroconectaRoadmapFixture, roadmapDimensionFixture } from '@/test/fixtures/roadmap';
import { RoadmapPhaseList } from '../RoadmapPhaseList';
import { RoadmapExplanationPanel } from '../RoadmapExplanationPanel';
import userEvent from '@testing-library/user-event';

const AGROCONECTA = agroconectaRoadmapFixture();

describe('RoadmapPhaseList', () => {
  it('muestra las dos fases del caso AgroConecta', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(screen.getByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fase 2' })).toBeInTheDocument();
  });

  it('presenta las dimensiones de una fase como paralelas, no como jerarquía', () => {
    // The order within a phase is canonical so the response is
    // deterministic; it is not a priority. Rendering it numbered would convey
    // a precedence the engine did not calculate.
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(
      screen.getByText(/2 dimensiones se trabajan al mismo tiempo/),
    ).toBeInTheDocument();
  });

  it('no anuncia paralelismo en una fase de una sola dimensión', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);
    expect(screen.queryByText(/1 dimensiones se trabajan/)).not.toBeInTheDocument();
  });

  it('muestra de qué nivel a qué nivel va cada dimensión, en palabras y en una barra', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const business = screen.getByRole('heading', { name: 'Negocio' }).closest('article')!;
    expect(business).toHaveTextContent('De nivel 3 a nivel 4');
    expect(
      within(business).getByRole('img', { name: 'Nivel 3 de 9, con meta en el nivel 4' }),
    ).toBeInTheDocument();
  });

  it('explica qué desbloquea cada dimensión, para que el orden sea refutable', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const pi = screen
      .getByRole('heading', { name: 'Propiedad Intelectual' })
      .closest('article')!;
    expect(within(pi).getByText(/Al llegar a su meta, Financiación podrá avanzar/)).toBeInTheDocument();
  });

  it('omite la nota de desbloqueo cuando la dimensión no habilita a nadie', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const financing = screen
      .getByRole('heading', { name: 'Financiación' })
      .closest('article')!;
    expect(within(financing).queryByText(/podrá avanzar|podrán avanzar/)).toBeNull();
  });

  // Each card says why the dimension is in the plan and what
  // sets its target, from the fields the backend sends.
  it('dice por qué una dimensión está en el plan: por debajo de su mínimo', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const business = screen.getByRole('heading', { name: 'Negocio' }).closest('article')!;
    expect(business).toHaveTextContent('debería llegar al menos al nivel 4');
    expect(business).toHaveTextContent('La meta es el nivel que se espera de ella: 4');
  });

  it('dice cuando una dimensión entra porque otra la necesita, y quién fija su meta', () => {
    const roadmap = {
      ...AGROCONECTA,
      phases: [
        {
          order: 1,
          dimensions: [
            roadmapDimensionFixture('TmRL', {
              currentLevel: 4,
              targetLevel: 6,
              enables: ['BRL', 'FRL'],
              inclusionReason: 'REQUIRED_ENABLER',
              expectedMinimum: 4,
              targetDrivenBy: dimensionRefFixture('BRL'),
            }),
          ],
        },
      ],
    };
    render(<RoadmapPhaseList roadmap={roadmap} />);

    const team = screen.getByRole('heading', { name: 'Equipo' }).closest('article')!;
    expect(team).toHaveTextContent(
      'Ya cumple lo que se espera, pero Negocio y Financiación necesitan que suba para poder avanzar.',
    );
    expect(team).toHaveTextContent('Negocio necesita que llegue al nivel 6, por eso esa es su meta.');
  });

  it('nombra las dimensiones que quedaron fuera del plan', () => {
    // Without this, a dimension's absence would read as an oversight.
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(screen.getByText(/Tecnología, Cliente, Equipo/)).toBeInTheDocument();
    expect(screen.getByText(/ya alcanzan el nivel esperado/)).toBeInTheDocument();
  });

  it('usa las etiquetas cortas compartidas, no los códigos crudos', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(screen.getByRole('heading', { name: 'Negocio' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'BRL' })).not.toBeInTheDocument();
  });

  it('un roadmap vacío se presenta como resultado, no como error', () => {
    // Meeting the minimum in all six dimensions is a healthy outcome.
    render(
      <RoadmapPhaseList
        roadmap={{
          ...AGROCONECTA,
          phases: [],
          dimensionsWithoutIntervention: (['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const).map(
            dimensionRefFixture,
          ),
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Sin fases pendientes' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('RoadmapPhaseList — lenguaje llano', () => {
  it('no usa flechas ni símbolos de código en las tarjetas', () => {
    const { container } = render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(container.textContent).not.toMatch(/[→⇄⇔↔≤≥]/);
  });

  it('no deja texto de tamaño de nota: nada de text-xs', () => {
    const { container } = render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(container.innerHTML).not.toContain('text-xs');
    expect(container.innerHTML).not.toContain('text-[10px]');
  });
});

describe('RoadmapExplanationPanel', () => {
  async function opened(roadmap = AGROCONECTA) {
    render(<RoadmapExplanationPanel roadmap={roadmap} />);
    await userEvent.click(screen.getByRole('button', { name: /Cómo se armó este plan/ }));
    return document.getElementById('roadmap-explanation')!;
  }

  it('explica la lógica en tres pasos con títulos claros', async () => {
    await opened();

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      '1. Qué dimensiones entran',
      '2. A qué nivel debe llegar cada una',
      '3. Qué va primero',
      'Qué quedó fuera',
    ]);
  });

  it('cuenta qué espera a qué con frases, no con flechas', async () => {
    const panel = await opened();

    expect(panel.textContent).toContain('Financiación avanza cuando Propiedad Intelectual llega a su meta.');
    expect(panel.textContent).not.toMatch(/[→⇄⇔↔]/);
  });

  it('nombra lo que quedó fuera y por qué', async () => {
    const panel = await opened();

    expect(panel.textContent).toContain('alcanzan el nivel esperado');
    expect(within(panel).getByText('Tecnología')).toBeInTheDocument();
  });

  it('no muestra identificadores ni una tabla de columnas técnicas', async () => {
    const panel = await opened();

    expect(within(panel).queryByRole('table')).not.toBeInTheDocument();
    expect(panel.textContent).not.toMatch(/\b(E-?0?\d|TRL|CRL|BRL|IPRL|TmRL|FRL)\b/);
  });

  it('el texto de lectura no baja de text-sm', async () => {
    const panel = await opened();

    expect(panel.innerHTML).not.toContain('text-xs');
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { dimensionRefFixture } from '@/test/fixtures/dimensions';
import { agroconectaRoadmapFixture, roadmapDimensionFixture } from '@/test/fixtures/roadmap';
import { RoadmapPhaseList } from '../RoadmapPhaseList';

const AGROCONECTA = agroconectaRoadmapFixture();

describe('RoadmapPhaseList', () => {
  it('muestra las dos fases del caso AgroConecta', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(screen.getByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fase 2' })).toBeInTheDocument();
  });

  it('presenta las dimensiones de una fase como paralelas, no como jerarquía', () => {
    // El orden dentro de una fase es canónico para que la respuesta sea
    // determinista; no es prioridad. Renderizarlo numerado comunicaría
    // una precedencia que el motor no calculó.
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    expect(
      screen.getByText(/2 dimensiones se trabajan en paralelo/),
    ).toBeInTheDocument();
  });

  it('no anuncia paralelismo en una fase de una sola dimensión', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);
    expect(screen.queryByText(/1 dimensiones se trabajan/)).not.toBeInTheDocument();
  });

  it('muestra el salto de nivel de cada dimensión', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const negocio = screen.getByRole('heading', { name: 'Negocio' }).closest('[role="article"]') as HTMLElement;
    expect(within(negocio).getByText('Nivel 3')).toBeInTheDocument();
    expect(within(negocio).getByText('Nivel 4')).toBeInTheDocument();
  });

  it('explica qué desbloquea cada dimensión, para que el orden sea refutable', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const pi = screen
      .getByRole('heading', { name: 'Propiedad Intelectual' })
      .closest('[role="article"]') as HTMLElement;
    expect(within(pi).getByText(/desbloquea Financiación/)).toBeInTheDocument();
  });

  it('omite la nota de desbloqueo cuando la dimensión no habilita a nadie', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const financiacion = screen
      .getByRole('heading', { name: 'Financiación' })
      .closest('[role="article"]') as HTMLElement;
    expect(within(financiacion).queryByText(/desbloquea/)).toBeNull();
  });

  // Backlog 10.1: each card says why the dimension is in the plan and what
  // sets its target, from the fields the backend sends.
  it('dice por qué una dimensión está en el plan: por debajo de su mínimo', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const negocio = screen.getByRole('heading', { name: 'Negocio' }).closest('[role="article"]') as HTMLElement;
    expect(within(negocio).getByText(/Está por debajo del mínimo esperado \(nivel 4\)/)).toBeInTheDocument();
    expect(within(negocio).getByText(/La meta es su mínimo esperado/)).toBeInTheDocument();
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

    const equipo = screen.getByRole('heading', { name: 'Equipo' }).closest('[role="article"]') as HTMLElement;
    expect(
      within(equipo).getByText(/Cumple su mínimo esperado, pero Negocio y Financiación la necesitan/),
    ).toBeInTheDocument();
    expect(within(equipo).getByText(/La meta la fija Negocio, que la necesita en nivel 6/)).toBeInTheDocument();
  });

  it('nombra las dimensiones que quedaron fuera del plan', () => {
    // Sin esto, la ausencia de una dimensión se leería como un olvido.
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
    // Cumplir el mínimo en las seis dimensiones es un desenlace sano.
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

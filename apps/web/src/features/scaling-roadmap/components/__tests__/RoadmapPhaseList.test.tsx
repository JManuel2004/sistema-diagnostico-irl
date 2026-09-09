import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { RoadmapResponse } from '@innlab/contracts';
import { RoadmapPhaseList } from '../RoadmapPhaseList';

const AGROCONECTA: RoadmapResponse = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  generatedAt: '2026-09-08T10:00:00.000Z',
  phases: [
    {
      order: 1,
      dimensions: [
        { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: ['FRL'] },
        { dimensionCode: 'IPRL', currentLevel: 1, targetLevel: 4, enables: ['FRL'] },
      ],
    },
    {
      order: 2,
      dimensions: [
        { dimensionCode: 'FRL', currentLevel: 2, targetLevel: 4, enables: [] },
      ],
    },
  ],
  dimensionsWithoutIntervention: ['TRL', 'CRL', 'TmRL'],
};

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

    const negocio = screen.getByRole('heading', { name: 'Negocio' }).closest('article')!;
    expect(within(negocio).getByText('Nivel 3')).toBeInTheDocument();
    expect(within(negocio).getByText('Nivel 4')).toBeInTheDocument();
  });

  it('explica qué desbloquea cada dimensión, para que el orden sea refutable', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const pi = screen
      .getByRole('heading', { name: 'Propiedad Intelectual' })
      .closest('article')!;
    expect(within(pi).getByText(/desbloquea Financiación/)).toBeInTheDocument();
  });

  it('omite la nota de desbloqueo cuando la dimensión no habilita a nadie', () => {
    render(<RoadmapPhaseList roadmap={AGROCONECTA} />);

    const financiacion = screen
      .getByRole('heading', { name: 'Financiación' })
      .closest('article')!;
    expect(within(financiacion).queryByText(/desbloquea/)).toBeNull();
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
          dimensionsWithoutIntervention: [
            'TRL',
            'CRL',
            'BRL',
            'IPRL',
            'TmRL',
            'FRL',
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Sin fases pendientes' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

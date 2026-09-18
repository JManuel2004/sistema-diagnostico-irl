import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LayerTraceResponse } from '@innlab/contracts';
import { LayerTracePanel } from '../LayerTracePanel';
import { RecommendationSummary } from '../RecommendationSummary';

const APORTES = {
  bottleneck: {
    value: 1.5,
    details: [{ dimension: 'IPRL', sourceLabel: 'secondary', value: 0.5 }],
  },
  gaps: {
    value: 3,
    details: [
      { dimension: 'BRL', sourceLabel: 'primary', value: 1 },
      { dimension: 'FRL', sourceLabel: 'not_applicable', value: 0 },
    ],
  },
  imbalances: {
    value: 2.25,
    details: [
      {
        pair: 'TRL-IPRL',
        classification: 'CRITICAL',
        sourceLabel: 'secondary',
        value: 0.5,
      },
    ],
  },
  stageAffinity: { value: 0.8, matches: true },
  rangePenalty: { value: 2, applied: true },
};

function trace(over: Partial<LayerTraceResponse> = {}): LayerTraceResponse {
  return {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    layer1Excluded: [
      {
        idService: 6,
        name: 'Proyectos de Grado',
        exclusionMessage: 'Requieren vinculación académica confirmada.',
      },
    ],
    rankingBeforeExceptions: [
      {
        position: 1,
        idService: 3,
        name: 'Consultoría',
        score: 5.55,
        contributions: APORTES,
      },
    ],
    appliedExceptions: [
      {
        code: 'E-01',
        order: 1,
        action: 'FORCE',
        targetService: 'Consultoría',
        declaredReason: 'Un riesgo legal crítico requiere asesoría especializada.',
        rankingBefore: [],
        rankingAfter: [],
        effect: 'Consultoría ya ocupaba el puesto 1',
      },
    ],
    discardedExceptions: [
      { code: 'E-02', order: 2, reason: 'La condición no se cumple' },
    ],
    rankingAfterExceptions: [],
    adjustedByException: false,
    incompleteCharacterization: [],
    factsHash: 'a'.repeat(64),
    evaluatedAt: '2026-09-07T14:30:00.000Z',
    ...over,
  };
}

describe('LayerTracePanel', () => {
  it('arranca colapsado y no pide la trace hasta que se abre', () => {
    const onOpen = vi.fn();
    render(<LayerTracePanel trace={undefined} isLoading={false} onOpen={onOpen} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('avisa al abrirse para que la trace se cargue solo entonces', async () => {
    const onOpen = vi.fn();
    render(<LayerTracePanel trace={undefined} isLoading={false} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('explica los contributions en vocabulario ordinal, sin exponer los puntajes', async () => {
    render(<LayerTracePanel trace={trace()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    const panel = document.getElementById('trace-layers')!;
    expect(panel.textContent).toContain('IPRL: secondary');
    expect(panel.textContent).toContain('BRL (primary)');
    // El número de la calibración es un detalle interno: mostrarlo
    // desplazaría la conversación al valor en vez de a la recomendación.
    expect(panel.textContent).not.toContain('5.55');
    expect(panel.textContent).not.toContain('1.5');
  });

  it('omite las dimensions que el service no atiende', async () => {
    render(<LayerTracePanel trace={trace()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    expect(document.getElementById('trace-layers')!.textContent).not.toContain(
      'FRL',
    );
  });

  it('muestra el reason declarado del ajuste que se aplicó', async () => {
    render(<LayerTracePanel trace={trace()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/E-01 · FORCE Consultoría/)).toBeInTheDocument();
    expect(
      screen.getByText(/riesgo legal crítico requiere asesoría/),
    ).toBeInTheDocument();
  });

  it('avisa cuando el resultado viene de un ajuste y no del cálculo', async () => {
    // Es la línea que separa un sistema auditable de uno que parece
    // objetivo sin serlo.
    render(
      <LayerTracePanel
        trace={trace({ adjustedByException: true })}
        isLoading={false}
        onOpen={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('status').textContent).toContain(
      'ajuste puntual del centro, no del resultado del cálculo',
    );
  });

  it('no muestra ese aviso cuando el service ganó el cálculo', async () => {
    render(<LayerTracePanel trace={trace()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('señala cuando faltaron datos de caracterización', async () => {
    render(
      <LayerTracePanel
        trace={trace({ incompleteCharacterization: ['stage', 'teamSize'] })}
        isLoading={false}
        onOpen={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button'));

    expect(
      screen.getByText(/no tiene registrados stage, teamSize/),
    ).toBeInTheDocument();
  });
});

describe('RecommendationSummary', () => {
  const base = {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    generatedAt: '2026-09-07T14:30:00.000Z',
  } as const;

  it('presenta el service y su justificación sin mostrar puntajes', () => {
    render(
      <RecommendationSummary
        recommendation={{
          ...base,
          resultType: 'RECOMMENDATION',
          primary: {
            idService: 3,
            name: 'Consultoría',
            position: 1,
            score: 5.55,
          },
          justification: 'Atiende el riesgo legal más urgente del perfil.',
          noRecommendationReason: null,
          alternatives: [
            { idService: 2, name: 'Mentoría', position: 2, score: 3.8 },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/riesgo legal más urgente/)).toBeInTheDocument();
    expect(screen.getByText('Mentoría')).toBeInTheDocument();
    expect(screen.queryByText(/5\.55/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3\.8/)).not.toBeInTheDocument();
  });

  it('explica el caso sin recomendación en vez de mostrar una vacía', () => {
    render(
      <RecommendationSummary
        recommendation={{
          ...base,
          resultType: 'NO_RECOMMENDATION',
          primary: null,
          justification: null,
          noRecommendationReason:
            'Ningún service alcanzó la pertinencia mínima para este perfil.',
          alternatives: [],
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /Sin recomendación/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pertinencia mínima/)).toBeInTheDocument();
  });
});

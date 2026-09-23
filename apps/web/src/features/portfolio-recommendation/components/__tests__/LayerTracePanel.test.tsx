import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LayerTraceResponse } from '@innlab/contracts';
import { LayerTracePanel } from '../LayerTracePanel';
import { RecommendationSummary } from '../RecommendationSummary';

const NAMES = {
  TRL: 'Tecnología',
  BRL: 'Negocio',
  IPRL: 'Propiedad Intelectual',
  FRL: 'Financiación',
};

const CONTRIBUTIONS = {
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

const RANKING_BEFORE = [
  { position: 1, idService: 2, name: 'Mentoría', score: 6 },
  { position: 2, idService: 3, name: 'Consultoría', score: 5.55 },
];
const RANKING_AFTER = [
  { position: 1, idService: 3, name: 'Consultoría', score: 5.55 },
  { position: 2, idService: 2, name: 'Mentoría', score: 6 },
];

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
        contributions: CONTRIBUTIONS,
      },
    ],
    appliedExceptions: [
      {
        code: 'E-01',
        order: 1,
        action: 'FORCE',
        targetService: 'Consultoría',
        declaredReason: 'Un riesgo legal crítico requiere asesoría especializada.',
        rankingBefore: RANKING_BEFORE,
        rankingAfter: RANKING_AFTER,
        effect: 'Consultoría pasa del puesto 2 al puesto 1',
      },
    ],
    discardedExceptions: [{ code: 'E-02', order: 2, reason: 'La condición no se cumple' }],
    rankingAfterExceptions: [],
    adjustedByException: false,
    incompleteCharacterization: [],
    factsHash: 'a'.repeat(64),
    evaluatedAt: '2026-09-07T14:30:00.000Z',
    ...over,
  };
}

async function openPanel(t: LayerTraceResponse = trace()) {
  render(<LayerTracePanel trace={t} isLoading={false} onOpen={vi.fn()} dimensionNames={NAMES} />);
  await userEvent.click(screen.getByRole('button'));
  return document.getElementById('trace-layers')!;
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

  // The answer comes first: whoever does not want the detail reads one sentence.
  it('abre con el veredicto: qué servicio quedó primero y por qué', async () => {
    const panel = await openPanel();

    expect(panel.textContent).toContain(
      'Consultoría fue la primera en el cálculo y, además, el centro la fija como primera opción.',
    );
  });

  it('cuando la recomendación sale de un ajuste, el veredicto lo dice', async () => {
    const panel = await openPanel(trace({ adjustedByException: true }));

    expect(panel.textContent).toContain(
      'Consultoría es la recomendación porque el centro la eligió por encima del resultado del cálculo.',
    );
  });

  it('cuenta el cálculo en tres pasos', async () => {
    await openPanel();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toHaveLength(3);
    expect(titles[0]).toContain('Paso 1: Lo que no aplica');
    expect(titles[1]).toContain('Paso 2: El orden según tu perfil');
    expect(titles[2]).toContain('Paso 3: Ajuste del centro');
  });

  describe('paso 1 — lo que se descartó', () => {
    it('dice qué servicios no aplican y por qué', async () => {
      const panel = await openPanel();

      expect(panel.textContent).toContain('Proyectos de Grado.');
      expect(panel.textContent).toContain('Requieren vinculación académica confirmada.');
    });

    it('dice que ninguno se descartó cuando es así', async () => {
      const panel = await openPanel(trace({ layer1Excluded: [] }));

      expect(panel.textContent).toContain('Ningún servicio quedó descartado');
    });
  });

  describe('paso 2 — el orden', () => {
    it('resume los aportes en etiquetas, con los nombres de las dimensiones y sin códigos', async () => {
      const panel = await openPanel();

      expect(panel.textContent).toContain('Cuello de botella: Propiedad Intelectual');
      expect(panel.textContent).toContain('1 brecha');
      expect(panel.textContent).toContain('1 desequilibrio');
      expect(panel.textContent).toContain('Encaja con tu etapa');
      expect(panel.textContent).not.toMatch(/\b(TRL|BRL|IPRL|FRL)\b/);
      // The ordinal labels are internal, in English: never shown as they come.
      expect(panel.textContent).not.toMatch(/primary|secondary|marginal|not_applicable/);
    });

    // A count that cannot be opened explains nothing: the label says how many
    // and, in its detail, which ones. The text also travels for whoever has no pointer.
    it('dice cuáles son las brechas y los desequilibrios que resume', async () => {
      const panel = await openPanel();

      expect(panel.textContent).toContain('Ayuda a cerrar las brechas en Negocio.');
      expect(panel.textContent).toContain(
        'Ayuda con el desequilibrio entre Tecnología y Propiedad Intelectual.',
      );
      expect(panel.textContent).toContain(
        'Es un servicio de apoyo para Propiedad Intelectual, lo que más frena tu avance.',
      );
    });

    it('muestra ese detalle al pasar el cursor por la etiqueta', async () => {
      const user = userEvent.setup();
      await openPanel();

      await user.hover(screen.getByRole('button', { name: /1 brecha/ }));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Ayuda a cerrar las brechas en Negocio.',
      );
    });

    it('no expone los puntajes de la calibración', async () => {
      const panel = await openPanel();

      // The number is an internal detail: showing it would move the conversation to the value.
      expect(panel.textContent).not.toContain('5.55');
      expect(panel.textContent).not.toContain('1.5');
    });

    it('omite las dimensiones que el servicio no atiende', async () => {
      const panel = await openPanel();

      expect(panel.textContent).not.toContain('Financiación');
    });

    it('dice cuando el servicio suele usarse con otro nivel de madurez', async () => {
      const panel = await openPanel();

      expect(panel.textContent).toContain('Suele usarse con iniciativas de otro nivel de madurez');
    });

    it('dice que no hay afinidad destacada cuando nada aporta', async () => {
      const panel = await openPanel(
        trace({
          rankingBeforeExceptions: [
            {
              position: 1,
              idService: 3,
              name: 'Consultoría',
              score: 1,
              contributions: {
                bottleneck: { value: 0, details: [] },
                gaps: { value: 0, details: [] },
                imbalances: { value: 0, details: [] },
                stageAffinity: { value: 0, matches: false },
                rangePenalty: { value: 0, applied: false },
              },
            },
          ],
        }),
      );

      expect(panel.textContent).toContain('No tiene una afinidad destacada con tu perfil');
    });
  });

  describe('paso 3 — los ajustes', () => {
    it('describe el ajuste por lo que hizo y no por su código', async () => {
      const panel = await openPanel();

      expect(screen.getByText('Se dejó Consultoría como primera opción')).toBeInTheDocument();
      expect(panel.textContent).toContain('Pasó del lugar 2 al lugar 1.');
      expect(panel.textContent).not.toMatch(/E-0\d|FORCE|PROMOTE|DEMOTE|VETO/);
    });

    it('muestra la razón que declaró el centro', async () => {
      await openPanel();

      expect(screen.getByText(/riesgo legal crítico requiere asesoría/)).toBeInTheDocument();
    });

    it.each([
      ['PROMOTE', 'Se subió Consultoría en el orden'],
      ['DEMOTE', 'Se bajó Consultoría en el orden'],
      ['VETO', 'Se retiró Consultoría de las opciones'],
    ] as const)('la acción %s se lee «%s»', async (action, title) => {
      const t = trace();
      await openPanel({ ...t, appliedExceptions: [{ ...t.appliedExceptions[0], action }] });

      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('dice que ya estaba en ese lugar cuando el ajuste no lo movió', async () => {
      const t = trace();
      const same = [{ position: 1, idService: 3, name: 'Consultoría', score: 5 }];
      const panel = await openPanel({
        ...t,
        appliedExceptions: [{ ...t.appliedExceptions[0], rankingBefore: same, rankingAfter: same }],
      });

      expect(panel.textContent).toContain('Ya estaba en el lugar 1.');
    });

    it('dice que no hizo falta ningún ajuste cuando no se aplicó ninguno', async () => {
      const panel = await openPanel(trace({ appliedExceptions: [], discardedExceptions: [] }));

      expect(panel.textContent).toContain('No hizo falta ningún ajuste');
    });

    it('cuenta los ajustes revisados y no aplicados sin listar sus códigos', async () => {
      const panel = await openPanel();

      expect(panel.textContent).toContain(
        'Se revisó otro ajuste posible, pero no aplica a tu iniciativa.',
      );
      expect(panel.textContent).not.toContain('E-02');
      expect(panel.textContent).not.toContain('La condición no se cumple');
    });

    it('usa el plural cuando fueron varios', async () => {
      const panel = await openPanel(
        trace({
          discardedExceptions: [
            { code: 'E-02', order: 2, reason: 'x' },
            { code: 'E-03', order: 3, reason: 'y' },
          ],
        }),
      );

      expect(panel.textContent).toContain('Se revisaron otros 2 ajustes posibles');
    });
  });

  it('avisa cuando el resultado viene de un ajuste y no del cálculo', async () => {
    // It is the line that separates an auditable system from one that looks
    // objective without being so.
    await openPanel(trace({ adjustedByException: true }));

    expect(screen.getByRole('status').textContent).toContain(
      'ajuste puntual del centro, no del resultado del cálculo',
    );
  });

  it('no muestra ese aviso cuando el servicio ganó el cálculo', async () => {
    await openPanel();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('señala cuando faltaron datos de la iniciativa, en español', async () => {
    await openPanel(trace({ incompleteCharacterization: ['stage', 'teamSize'] }));

    // The field's code is stable; what the user reads is in Spanish.
    expect(
      screen.getByText(/Falta información de tu iniciativa: la etapa, el tamaño del equipo/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/teamSize/)).not.toBeInTheDocument();
  });

  // The date lives in `ResultMeta`, once, under the page title;
  // the panel no longer repeats it.
  it('no repite la fecha del resultado', async () => {
    await openPanel();

    expect(screen.queryByText(/Evaluado el/)).not.toBeInTheDocument();
  });

  it('no usa símbolos de código: ni flechas, ni puntos medios, ni siglas', async () => {
    const panel = await openPanel();

    expect(panel.textContent).not.toMatch(/[→⇄⇔↔≤≥·]/);
  });
});

describe('RecommendationSummary', () => {
  const base = {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    generatedAt: '2026-09-07T14:30:00.000Z',
  } as const;

  const recommendation = {
    ...base,
    resultType: 'RECOMMENDATION' as const,
    primary: { idService: 3, name: 'Consultoría', position: 1, score: 5.55 },
    justification: 'Atiende el riesgo legal más urgente del perfil.',
    noRecommendationReason: null,
    alternatives: [{ idService: 2, name: 'Mentoría', position: 2, score: 3.8 }],
  };

  it('presenta el servicio y su justificación sin mostrar puntajes', () => {
    render(<RecommendationSummary recommendation={recommendation} />);

    expect(screen.getByRole('heading', { name: 'Consultoría' })).toBeInTheDocument();
    expect(screen.getByText(/riesgo legal más urgente/)).toBeInTheDocument();
    expect(screen.getByText('Mentoría')).toBeInTheDocument();
    expect(screen.queryByText(/5\.55/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3\.8/)).not.toBeInTheDocument();
  });

  it('la presenta como recomendada para la iniciativa, por su nombre', () => {
    render(<RecommendationSummary recommendation={recommendation} subject="AgroConecta" />);

    expect(screen.getByText('Recomendado para AgroConecta')).toBeInTheDocument();
  });

  it('sin nombre habla de «tu iniciativa»', () => {
    render(<RecommendationSummary recommendation={recommendation} />);

    expect(screen.getByText('Recomendado para tu iniciativa')).toBeInTheDocument();
  });

  it('explica el caso sin recomendación en vez de mostrar una vacía', () => {
    render(
      <RecommendationSummary
        recommendation={{
          ...base,
          resultType: 'NO_RECOMMENDATION',
          primary: null,
          justification: null,
          noRecommendationReason: 'Ningún servicio alcanzó la pertinencia mínima para este perfil.',
          alternatives: [],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: /Sin recomendación/ })).toBeInTheDocument();
    expect(screen.getByText(/pertinencia mínima/)).toBeInTheDocument();
  });
});

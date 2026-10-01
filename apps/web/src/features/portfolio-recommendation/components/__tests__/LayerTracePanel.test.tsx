import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  { position: 1, idService: 2, name: 'Reto Express', score: 6, includedBy: null },
  { position: 2, idService: 3, name: 'Consultoría Experta', score: 5.55, includedBy: null },
];
const RANKING_AFTER = [
  { position: 1, idService: 3, name: 'Consultoría Experta', score: 5.55, includedBy: null },
  { position: 2, idService: 2, name: 'Reto Express', score: 6, includedBy: null },
];

function trace(over: Partial<LayerTraceResponse> = {}): LayerTraceResponse {
  return {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    layer1Excluded: [
      {
        idService: 6,
        name: 'Célula de Grado · Pregrado',
        ruleCode: 'ELG-01A',
        exclusionMessage: 'Requieren vinculación académica confirmada.',
      },
    ],
    rankingBeforeExceptions: [
      {
        position: 1,
        idService: 3,
        name: 'Consultoría Experta',
        score: 5.55,
        includedBy: null,
        contributions: CONTRIBUTIONS,
      },
    ],
    appliedExceptions: [
      {
        code: 'E-01',
        order: 1,
        action: 'FORCE',
        targetService: 'Consultoría Experta',
        declaredReason: 'Un riesgo legal crítico requiere asesoría especializada.',
        rankingBefore: RANKING_BEFORE,
        rankingAfter: RANKING_AFTER,
        effect: 'Consultoría Experta pasa del puesto 2 al puesto 1',
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

/** The content of a step of the panel, found by its heading. */
function step(n: number) {
  const heading = screen.getByRole('heading', { name: new RegExp(`^Paso ${String(n)}:`) });
  return within(heading.closest('li')!);
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
      'Consultoría Experta fue la primera en el cálculo y, además, el centro la fija como primera opción.',
    );
  });

  it('cuando la recomendación sale de un ajuste, el veredicto lo dice', async () => {
    const panel = await openPanel(trace({ adjustedByException: true }));

    expect(panel.textContent).toContain(
      'Consultoría Experta es la recomendación porque el centro la eligió por encima del resultado del cálculo.',
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

      expect(panel.textContent).toContain('Célula de Grado · Pregrado.');
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
              name: 'Consultoría Experta',
              score: 1,
              includedBy: null,
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
    it('un ajuste que incluye un servicio dice en qué lugar entró, sin código ni puntaje', async () => {
      const reto = {
        position: 1,
        idService: 2,
        name: 'Reto Express',
        score: 3.3,
        includedBy: null,
      };
      const academia = {
        position: 2,
        idService: 3,
        name: 'Academia a la Medida',
        score: null,
        includedBy: { ruleCode: 'INC-02', declaredReason: 'Formar al propio equipo.' },
      };
      const panel = await openPanel(
        trace({
          appliedExceptions: [
            {
              code: 'INC-02',
              order: 4,
              action: 'INCLUDE',
              targetService: 'Academia a la Medida',
              declaredReason: 'Formar al propio equipo.',
              rankingBefore: [reto],
              rankingAfter: [reto, academia],
              effect: 'Academia a la Medida entra al ranking en el puesto 2, sin puntaje',
            },
          ],
        }),
      );

      expect(
        screen.getByText('Se incluyó Academia a la Medida entre las opciones'),
      ).toBeInTheDocument();
      expect(panel.textContent).toContain(
        'Entró en el lugar 2, sin puntaje: no compite en el cálculo.',
      );
      expect(panel.textContent).not.toMatch(/INC-0\d|INCLUDE/);
    });

    it('describe el ajuste por lo que hizo y no por su código', async () => {
      const panel = await openPanel();

      expect(
        screen.getByText('Se dejó Consultoría Experta como primera opción'),
      ).toBeInTheDocument();
      expect(panel.textContent).toContain('Pasó del lugar 2 al lugar 1.');
      expect(panel.textContent).not.toMatch(/E-0\d|FORCE|PROMOTE|DEMOTE|VETO/);
    });

    it('muestra la razón que declaró el centro', async () => {
      await openPanel();

      expect(screen.getByText(/riesgo legal crítico requiere asesoría/)).toBeInTheDocument();
    });

    it.each([
      ['PROMOTE', 'Se subió Consultoría Experta en el orden'],
      ['DEMOTE', 'Se bajó Consultoría Experta en el orden'],
      ['VETO', 'Se retiró Consultoría Experta de las opciones'],
    ] as const)('la acción %s se lee «%s»', async (action, title) => {
      const t = trace();
      await openPanel({ ...t, appliedExceptions: [{ ...t.appliedExceptions[0], action }] });

      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('dice que ya estaba en ese lugar cuando el ajuste no lo movió', async () => {
      const t = trace();
      const same = [
        { position: 1, idService: 3, name: 'Consultoría Experta', score: 5, includedBy: null },
      ];
      const panel = await openPanel({
        ...t,
        appliedExceptions: [{ ...t.appliedExceptions[0], rankingBefore: same, rankingAfter: same }],
      });

      expect(panel.textContent).toContain('Ya estaba en el lugar 1.');
    });

    it('muestra el orden que dejaron los ajustes, junto a cada ajuste y su motivo', async () => {
      await openPanel(trace({ rankingAfterExceptions: RANKING_AFTER }));
      const step3 = step(3);

      expect(
        step3.getByText('Se dejó Consultoría Experta como primera opción'),
      ).toBeInTheDocument();
      expect(step3.getByText(/riesgo legal crítico requiere asesoría/)).toBeInTheDocument();
      const order = step3.getByRole('heading', { name: 'Así queda el orden' }).nextElementSibling;
      expect(order?.textContent).toMatch(/Puesto 1: Consultoría Experta.*Puesto 2: Reto Express/);
      expect(step3.getByText('Recomendado')).toBeInTheDocument();
      expect(step3.getByText('Lo movió un ajuste')).toBeInTheDocument();
    });

    it('en ese orden, el servicio que incluyó el centro lo dice y no muestra motivos del cálculo', async () => {
      const reto = {
        position: 1,
        idService: 2,
        name: 'Reto Express',
        score: 3.3,
        includedBy: null,
      };
      const academia = {
        position: 2,
        idService: 3,
        name: 'Academia a la Medida',
        score: null,
        includedBy: { ruleCode: 'INC-02', declaredReason: 'Formar al propio equipo.' },
      };
      const panel = await openPanel(
        trace({
          appliedExceptions: [
            {
              code: 'INC-02',
              order: 4,
              action: 'INCLUDE',
              targetService: 'Academia a la Medida',
              declaredReason: 'Formar al propio equipo.',
              rankingBefore: [reto],
              rankingAfter: [reto, academia],
              effect: 'Academia a la Medida entra al ranking en el puesto 2, sin puntaje',
            },
          ],
          rankingAfterExceptions: [reto, academia],
        }),
      );
      const step3 = step(3);

      expect(step3.getByText('Lo incluyó el centro')).toBeInTheDocument();
      expect(step3.getByText(/entra al orden solo por el ajuste del centro/)).toBeInTheDocument();
      expect(step3.queryByText('Lo movió un ajuste')).not.toBeInTheDocument();
      expect(panel.textContent).not.toMatch(/INC-0\d/);
    });

    it('si un ajuste puso otro servicio primero, el orden del cálculo no marca a su primero como recomendado', async () => {
      await openPanel(trace({ adjustedByException: true, rankingAfterExceptions: RANKING_AFTER }));
      const step2 = step(2);
      const step3 = step(3);

      expect(step2.queryByText('Recomendado')).not.toBeInTheDocument();
      expect(step3.getByText('Recomendado')).toBeInTheDocument();
    });

    it('dice que no hizo falta ningún ajuste cuando no se aplicó ninguno, sin repetir el orden', async () => {
      const panel = await openPanel(trace({ appliedExceptions: [], discardedExceptions: [] }));

      expect(panel.textContent).toContain('No hizo falta ningún ajuste');
      expect(screen.queryByRole('heading', { name: 'Así queda el orden' })).not.toBeInTheDocument();
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
    // Some official service names carry a middle dot («Célula de Grado ·
    // Pregrado»): that is catalog data, shown as is. What must not appear is
    // a symbol the panel adds on its own.
    const t = trace();
    const names = [
      ...t.layer1Excluded.map((e) => e.name),
      ...t.rankingBeforeExceptions.map((r) => r.name),
    ];
    const ownText = names.reduce(
      (text, name) => text.split(name).join(''),
      panel.textContent ?? '',
    );

    expect(ownText).not.toMatch(/[→⇄⇔↔≤≥·]/);
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
    primary: {
      idService: 3,
      name: 'Consultoría Experta',
      description: 'Consultoría colaborativa con calidad lista para el mercado.',
      position: 1,
      score: 5.55,
      adjustmentReason: null,
    },
    justification: 'Atiende el riesgo legal más urgente del perfil.',
    noRecommendationReason: null,
    alternatives: [
      {
        idService: 2,
        name: 'Reto Express',
        description: null,
        position: 2,
        score: 3.8,
        adjustmentReason: null,
      },
    ],
  };

  it('presenta el servicio y su justificación sin mostrar puntajes', () => {
    render(<RecommendationSummary recommendation={recommendation} />);

    expect(screen.getByRole('heading', { name: 'Consultoría Experta' })).toBeInTheDocument();
    expect(screen.getByText(/riesgo legal más urgente/)).toBeInTheDocument();
    expect(screen.getByText('Reto Express')).toBeInTheDocument();
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

  it('una alternativa que incluyó el centro dice por qué, sin mostrar puntaje', () => {
    render(
      <RecommendationSummary
        recommendation={{
          ...recommendation,
          primary: {
            idService: 2,
            name: 'Reto Express',
            description: null,
            position: 1,
            score: 3.3,
            adjustmentReason: null,
          },
          alternatives: [
            {
              idService: 3,
              name: 'Academia a la Medida',
              description: null,
              position: 2,
              score: null,
              adjustmentReason: 'Formar al propio equipo deja capacidades instaladas.',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('También podrían encajar')).toBeInTheDocument();
    expect(screen.getByText(/la sugiere el/)).toHaveTextContent(
      'Academia a la Medida la sugiere el centro: Formar al propio equipo deja capacidades instaladas.',
    );
    expect(screen.queryByText(/3[.,]3/)).not.toBeInTheDocument();
  });

  it('una alternativa calculada no lleva motivo de ajuste', () => {
    render(<RecommendationSummary recommendation={recommendation} />);

    expect(screen.queryByText(/la sugiere el/)).not.toBeInTheDocument();
  });

  it('explica de qué se trata el servicio recomendado con la descripción del catálogo', () => {
    render(<RecommendationSummary recommendation={recommendation} />);

    expect(screen.getByRole('heading', { name: '¿De qué se trata?' })).toBeInTheDocument();
    expect(screen.getByText(/calidad lista para el mercado/)).toBeInTheDocument();
  });

  it('sin descripción en el catálogo no muestra la sección', () => {
    render(
      <RecommendationSummary
        recommendation={{
          ...recommendation,
          primary: { ...recommendation.primary, description: null },
        }}
      />,
    );

    expect(screen.queryByRole('heading', { name: '¿De qué se trata?' })).not.toBeInTheDocument();
  });

  it('sin flujo de solicitud, la acción se muestra deshabilitada y anunciada como próxima', () => {
    render(<RecommendationSummary recommendation={recommendation} />);

    expect(screen.getByRole('button', { name: 'Solicitar acompañamiento' })).toBeDisabled();
    expect(screen.getByText(/Próximamente podrás pedirle este servicio/)).toBeInTheDocument();
  });

  it('con flujo de solicitud, la acción lo dispara', async () => {
    const onRequestService = vi.fn();
    render(
      <RecommendationSummary recommendation={recommendation} onRequestService={onRequestService} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar acompañamiento' }));

    expect(onRequestService).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Próximamente/)).not.toBeInTheDocument();
  });
});

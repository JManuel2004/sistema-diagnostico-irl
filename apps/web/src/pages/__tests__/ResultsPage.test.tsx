import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { toast } from 'sonner';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { meContextHandler, signIn } from '@/test/fixtures/me-context';
import { clearSession } from '@/shared/auth/session';
import type { DimensionCode } from '@innlab/contracts';
import ResultsPage from '../ResultsPage';
import { renderWithClient } from '@/test/render-with-client';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { agroconectaRoadmapFixture } from '@/test/fixtures/roadmap';
import { initiativeFixture } from '@/test/fixtures/initiative';
import { questionnaireFixture } from '@/test/fixtures/questionnaire';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CODES: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
// AgroConecta: TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2.
const LEVELS: Record<DimensionCode, number> = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 };

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// The page also reads the initiative (its name, description and sector) and the
// questionnaire catalog (what each dimension measures, for the tooltips).
beforeEach(() => {
  server.use(
    mswHttp.get('*/diagnostics/:id/initiative', () =>
      HttpResponse.json(
        initiativeFixture({
          productType: 'Aplicación web y módulo de trazabilidad para cooperativas',
        }),
      ),
    ),
    mswHttp.get('*/api/v1/catalog/questionnaire', () => HttpResponse.json(questionnaireFixture())),
  );
});

const PROFILE = {
  diagnosticId: ID,
  computedAt: '2026-03-05T15:30:00.000Z',
  globalAverage: 3.5,
  dimensionResults: CODES.map((c) => dimensionResultFixture(c, LEVELS[c])),
  bottleneck: { dimensions: ['IPRL'], level: 1 },
  strength: { dimensions: ['TRL'], level: 6 },
  asymmetry: { difference: 5, classification: 'critical' },
  gaps: { dimensions: ['BRL', 'IPRL', 'FRL'], threshold: 3 },
  criticalState: { dimensions: ['BRL'] },
  imbalances: [
    { left: 'TRL', right: 'CRL', difference: 2, classification: 'moderate' },
    { left: 'TRL', right: 'BRL', difference: 3, classification: 'moderate' },
    { left: 'CRL', right: 'BRL', difference: 1, classification: 'acceptable' },
    { left: 'TmRL', right: 'FRL', difference: 3, classification: 'moderate' },
    { left: 'BRL', right: 'IPRL', difference: 2, classification: 'moderate' },
    { left: 'TRL', right: 'IPRL', difference: 5, classification: 'critical' },
  ],
};

const RECOMMENDATION = {
  diagnosticId: ID,
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
  generatedAt: '2026-03-06T09:00:00.000Z',
};

function diagnostic(accepted: boolean, completed = true) {
  return {
    id: ID,
    userId: 'user-1',
    state: accepted
      ? 'DEEP_ANALYSIS_IN_PROGRESS'
      : completed
        ? 'PROFILE_GENERATED'
        : 'WITH_INITIATIVE',
    completed,
    deepAnalysisAccepted: accepted,
    createdAt: '2026-03-01T00:00:00.000Z',
    frameworkVersion: 'KTH-IRL-1.0',
  };
}

function problem(code: string, status: number) {
  return HttpResponse.json(
    {
      type: `https://errors.innlab.icesi.edu.co/${code.toLowerCase()}`,
      title: code,
      status,
      detail: code,
      code,
    },
    { status },
  );
}

/** Backend handlers; `requests` counts the calls to the deep-analysis endpoints. */
function backend(opts: {
  accepted: boolean;
  roadmap?: 'ok' | 'missing';
  recommendation?: 'ok' | 'missing';
}) {
  const requests = { roadmap: 0, recommendation: 0, deepAnalysis: 0 };
  server.use(
    mswHttp.get('*/diagnostics/:id/profile', () => HttpResponse.json(PROFILE)),
    mswHttp.get('*/diagnostics/:id', () => HttpResponse.json(diagnostic(opts.accepted))),
    mswHttp.get('*/diagnostics/:id/roadmap', () => {
      requests.roadmap += 1;
      return opts.roadmap === 'missing'
        ? problem('ROADMAP_NOT_GENERATED', 409)
        : HttpResponse.json(agroconectaRoadmapFixture());
    }),
    mswHttp.get('*/diagnostics/:id/recommendation', () => {
      requests.recommendation += 1;
      return opts.recommendation === 'missing'
        ? problem('ROUTING_RECOMMENDATION_NOT_GENERATED', 409)
        : HttpResponse.json(RECOMMENDATION);
    }),
  );
  return requests;
}

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={[`/diagnosticos/${ID}/resultados`]}>
      <Routes>
        <Route path="/diagnosticos/:id/resultados" element={<ResultsPage />} />
        <Route path="/diagnosticos/:id/asistente" element={<div>ASISTENTE_STUB</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// The first screen with the main navigation: the wizard before it has none.
describe('ResultsPage — navegación y acceso', () => {
  it('lleva la navegación principal, con el panel y los resultados', async () => {
    backend({ accepted: false });

    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Panel' })).toHaveAttribute('href', '/panel');
    expect(within(nav).getByRole('link', { name: 'Resultados' })).toHaveAttribute(
      'href',
      `/diagnosticos/${ID}/resultados`,
    );
    // The questionnaire is a wizard step, not a destination.
    expect(within(nav).queryByText('Cuestionario')).not.toBeInTheDocument();
  });

  it('el descriptor institucional lleva al panel, no a la portada', async () => {
    backend({ accepted: false });

    renderPage();

    expect(await screen.findByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toHaveAttribute(
      'href',
      '/panel',
    );
  });

  it('ofrece el menú de cuenta', async () => {
    backend({ accepted: false });
    signIn();
    server.use(meContextHandler());

    renderPage();

    expect(await screen.findByRole('button', { name: 'Cuenta' })).toBeInTheDocument();
    clearSession();
  });

  it('un diagnóstico que sigue en el asistente no tiene resultados: se le devuelve a él', async () => {
    server.use(
      mswHttp.get('*/diagnostics/:id/profile', () => problem('DIAGNOSTIC_NOT_FINALIZED', 409)),
      mswHttp.get('*/diagnostics/:id', () => HttpResponse.json(diagnostic(false, false))),
    );

    renderPage();

    expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
  });
});

describe('ResultsPage — sin análisis profundo', () => {
  it('muestra solo el perfil de madurez: radar, niveles y las señales del perfil', async () => {
    backend({ accepted: false });

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'AgroConecta' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: /Cuello de botella/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Brecha/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Perfil IRL — gráfico radar' })).toBeInTheDocument();
  });

  it('no muestra los pares desequilibrados ni las alertas de estado crítico', async () => {
    backend({ accepted: false });

    renderPage();

    await screen.findByRole('group', { name: /Cuello de botella/ });
    expect(screen.queryByText(/Pares desequilibrados/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pares fuera de balance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/está en estado crítico/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Desequilibrios y alertas/ }),
    ).not.toBeInTheDocument();
  });

  it('no muestra el roadmap ni la recomendación, y ni siquiera los pide', async () => {
    const requests = backend({ accepted: false });

    renderPage();

    await screen.findByRole('group', { name: /Cuello de botella/ });
    expect(screen.queryByRole('heading', { name: /plan de escalamiento/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /servicio de INNLAB para/ }),
    ).not.toBeInTheDocument();
    expect(requests.roadmap).toBe(0);
    expect(requests.recommendation).toBe(0);
  });

  it('el botón de aceptar vive en esta página y no envía nada al entrar', async () => {
    const requests = backend({ accepted: false });
    server.use(
      mswHttp.post('*/diagnostics/:id/deep-analysis', () => {
        requests.deepAnalysis += 1;
        return HttpResponse.json({});
      }),
    );

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Adquirir análisis profundo' }),
    ).toBeInTheDocument();
    expect(requests.deepAnalysis).toBe(0);
  });

  it('dice que el perfil es un resultado guardado, con la fecha de la respuesta', async () => {
    backend({ accepted: false });

    renderPage();

    expect(await screen.findByText(/Resultado guardado el 5 de marzo de 2026/)).toBeInTheDocument();
  });

  it('acepta el análisis profundo y pasa a mostrar todo en la misma página', async () => {
    let accepted = false;
    server.use(
      mswHttp.get('*/diagnostics/:id/profile', () => HttpResponse.json(PROFILE)),
      mswHttp.get('*/diagnostics/:id', () => HttpResponse.json(diagnostic(accepted))),
      mswHttp.post('*/diagnostics/:id/deep-analysis', () => {
        accepted = true;
        return HttpResponse.json(
          { diagnosticId: ID, state: 'DEEP_ANALYSIS_IN_PROGRESS' },
          { status: 201 },
        );
      }),
      mswHttp.get('*/diagnostics/:id/roadmap', () =>
        HttpResponse.json(agroconectaRoadmapFixture()),
      ),
      mswHttp.get('*/diagnostics/:id/recommendation', () => HttpResponse.json(RECOMMENDATION)),
    );
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Adquirir análisis profundo' }));

    expect(
      await screen.findByRole('heading', { name: 'Desequilibrios y alertas' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Consultoría Experta' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Adquirir análisis profundo' }),
    ).not.toBeInTheDocument();
  });

  it('avisa si no se pudo aceptar y deja reintentar', async () => {
    backend({ accepted: false });
    server.use(mswHttp.post('*/diagnostics/:id/deep-analysis', () => problem('INTERNAL', 500)));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Adquirir análisis profundo' }));

    expect(await screen.findByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('No fue posible aceptar el análisis profundo'),
    );
  });
});

describe('ResultsPage — con análisis profundo', () => {
  it('muestra, además del perfil, los pares desequilibrados, el estado crítico, el roadmap y la recomendación', async () => {
    backend({ accepted: true });

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Desequilibrios y alertas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Qué tan parejo avanza AgroConecta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: 'Negocio está en estado crítico' }),
    ).toHaveTextContent('Prioridad máxima');
    expect(await screen.findByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Consultoría Experta' })).toBeInTheDocument();
    // The profile is still there, on the same page.
    expect(screen.getByRole('heading', { level: 1, name: 'AgroConecta' })).toBeInTheDocument();
  });

  it('todo en una sola página: una vista, no pantallas separadas', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría Experta' });
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(
      expect.arrayContaining([
        'Cómo leer estos resultados',
        'Tu radar IRL',
        'Desequilibrios y alertas',
        'El plan de escalamiento de AgroConecta',
        'El servicio de INNLAB para AgroConecta',
      ]),
    );
  });

  it('la barra de secciones marca en cuál se está, como la navegación principal', async () => {
    backend({ accepted: true });

    renderPage();

    const bar = await screen.findByRole('navigation', { name: 'Secciones del resultado' });
    const current = within(bar)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'location');
    // Which one depends on the scroll (see `useActiveSection`); here, that
    // exactly one is marked, with the same blue underline as the header.
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveClass('aria-[current=location]:border-primary');
  });

  it('ya no ofrece aceptar el análisis profundo', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría Experta' });
    expect(
      screen.queryByRole('button', { name: /Adquirir análisis profundo/ }),
    ).not.toBeInTheDocument();
  });

  // Every saved result carries its own date, in the same style.
  it('cada resultado guardado lleva su propia fecha: perfil, roadmap y recomendación', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría Experta' });
    expect(screen.getByText(/Resultado guardado el 5 de marzo de 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado guardado el 8 de septiembre de 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado guardado el 6 de marzo de 2026/)).toBeInTheDocument();
  });

  it('reutiliza el panel plegable para el detalle: la explicación del roadmap y la traza', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría Experta' });
    expect(screen.getByRole('button', { name: /Cómo se armó este plan/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(
      screen.getByRole('button', { name: /Cómo se llegó a esta recomendación/ }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('si el roadmap no se generó del lado del servidor, avisa y ofrece reintentar', async () => {
    backend({ accepted: true, roadmap: 'missing' });

    renderPage();

    expect(await screen.findByText(/No fue posible generar el roadmap/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    // The recommendation, which did exist, is still shown.
    expect(await screen.findByRole('heading', { name: 'Consultoría Experta' })).toBeInTheDocument();
  });

  it('si la recomendación no se generó, avisa y el roadmap sigue visible', async () => {
    backend({ accepted: true, recommendation: 'missing' });

    renderPage();

    expect(await screen.findByText(/No fue posible generar la recomendación/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
  });
});

describe('ResultsPage — explicabilidad para quien no conoce el marco', () => {
  it('abre con un bloque de contexto: qué es el IRL, una dimensión y un nivel', async () => {
    backend({ accepted: false });

    renderPage();

    const context = (
      await screen.findByRole('heading', { name: 'Cómo leer estos resultados' })
    ).closest('div')!.parentElement!;
    expect(within(context).getByText(/Qué es el IRL/)).toBeInTheDocument();
    expect(within(context).getByText(/Qué es una dimensión/)).toBeInTheDocument();
    expect(within(context).getByText(/Qué es un nivel/)).toBeInTheDocument();
    expect(
      within(context).getByText(/de 1 \(muy inicial\) a 9 \(muy avanzado\)/),
    ).toBeInTheDocument();
  });

  it('nombra las seis dimensiones con lo que trae la respuesta, no con una lista del frontend', async () => {
    backend({ accepted: false });

    renderPage();

    const context = (
      await screen.findByRole('heading', { name: 'Cómo leer estos resultados' })
    ).closest('div')!.parentElement!;
    for (const name of [
      'Tecnología',
      'Cliente',
      'Negocio',
      'Propiedad Intelectual',
      'Equipo',
      'Financiación',
    ]) {
      expect(within(context).getByText(name)).toBeInTheDocument();
    }
  });

  it('explica cada término técnico en una frase, al pasar el cursor', async () => {
    backend({ accepted: true });
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole('heading', { name: 'Desequilibrios y alertas' });

    await user.hover(screen.getByRole('button', { name: 'Cuello de botella' }));
    expect((await screen.findAllByText(/menos avanzada/)).length).toBeGreaterThan(0);

    await user.hover(screen.getByRole('button', { name: /^Brecha/ }));
    expect((await screen.findAllByText(/parte más baja de la escala/)).length).toBeGreaterThan(0);

    await user.hover(screen.getByRole('button', { name: /desequilibrio/i }));
    expect((await screen.findAllByText(/deberían avanzar juntas/)).length).toBeGreaterThan(0);

    await user.hover(screen.getByRole('button', { name: /críticas/i }));
    expect((await screen.findAllByText(/dimensión clave del marco/)).length).toBeGreaterThan(0);
  });
});

describe('ResultsPage — el radar explica cada dimensión en su punta', () => {
  it('no tiene leyenda aparte: el color y el nombre están en la punta del radar', async () => {
    backend({ accepted: false });

    renderPage();

    await screen.findByRole('group', { name: 'Perfil IRL — gráfico radar' });
    expect(screen.queryByRole('list', { name: 'Leyenda del radar' })).not.toBeInTheDocument();
  });

  it('avisa que se puede pasar el cursor por cada punta para ver qué mide la dimensión', async () => {
    backend({ accepted: false });

    renderPage();

    expect(
      await screen.findByText('Pasa el cursor por cada punta para ver qué mide esa dimensión.'),
    ).toBeInTheDocument();
  });

  it('pasar por una tarjeta del resumen no rompe el radar compartido', async () => {
    backend({ accepted: false });
    const user = userEvent.setup();

    renderPage();
    const card = await screen.findByRole('group', { name: /Cuello de botella/ });

    await user.hover(card);
    await user.unhover(card);

    expect(screen.getByRole('group', { name: 'Perfil IRL — gráfico radar' })).toBeInTheDocument();
  });
});

describe('ResultsPage — la iniciativa como protagonista', () => {
  it('abre con su nombre, una descripción breve y el sector', async () => {
    backend({ accepted: false });

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'AgroConecta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aplicación web y módulo de trazabilidad para cooperativas'),
    ).toBeInTheDocument();
    expect(screen.getByText('Agroindustria / AgriTech')).toBeInTheDocument();
  });

  it('muestra al lado el nivel IRL global que calcula el backend', async () => {
    backend({ accepted: false });

    renderPage();

    const level = (await screen.findByText('Nivel IRL global')).closest('div')!;
    expect(level).toHaveTextContent('3,5');
    expect(level).toHaveTextContent('de 9');
  });

  it('se dirige a la iniciativa por su nombre en la invitación al análisis profundo', async () => {
    backend({ accepted: false });

    renderPage();

    expect(
      await screen.findByRole('heading', {
        name: '¿Quieres profundizar el diagnóstico de AgroConecta?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute('href', '/panel');
  });

  it('con el análisis profundo, sus secciones hablan de la iniciativa por su nombre', async () => {
    backend({ accepted: true });

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Qué atender primero en AgroConecta' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Recomendado para AgroConecta')).toBeInTheDocument();
  });

  it('si la iniciativa no carga, la cabecera habla de «tu iniciativa» y el resto sigue', async () => {
    backend({ accepted: false });
    server.use(mswHttp.get('*/diagnostics/:id/initiative', () => problem('INTERNAL', 500)));

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tu iniciativa' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: /Cuello de botella/ })).toBeInTheDocument();
  });
});

describe('ResultsPage — el análisis profundo se entiende sin conocer el sistema', () => {
  const TRACE = {
    diagnosticId: ID,
    layer1Excluded: [
      {
        idService: 6,
        name: 'Célula de Grado · Pregrado',
        ruleCode: 'ELG-01A',
        exclusionMessage: 'Requieren vinculación académica.',
      },
    ],
    rankingBeforeExceptions: [
      {
        position: 1,
        idService: 2,
        name: 'Reto Express',
        score: 4,
        includedBy: null,
        contributions: {
          bottleneck: {
            value: 1,
            details: [{ dimension: 'IPRL', sourceLabel: 'primary', value: 1 }],
          },
          gaps: { value: 0, details: [] },
          imbalances: {
            value: 1,
            details: [
              {
                pair: 'TRL-IPRL',
                classification: 'CRITICAL',
                sourceLabel: 'secondary',
                value: 0.5,
              },
            ],
          },
          stageAffinity: { value: 1, matches: true },
          rangePenalty: { value: 0, applied: false },
        },
      },
    ],
    appliedExceptions: [
      {
        code: 'E-01',
        order: 1,
        action: 'FORCE',
        targetService: 'Consultoría Experta',
        declaredReason: 'Un riesgo legal crítico requiere asesoría especializada.',
        rankingBefore: [
          { position: 2, idService: 3, name: 'Consultoría Experta', score: 3, includedBy: null },
        ],
        rankingAfter: [
          { position: 1, idService: 3, name: 'Consultoría Experta', score: 3, includedBy: null },
        ],
        effect: 'Consultoría Experta pasa del puesto 2 al puesto 1',
      },
    ],
    discardedExceptions: [{ code: 'E-02', order: 2, reason: 'La condición no se cumple' }],
    rankingAfterExceptions: [],
    adjustedByException: true,
    incompleteCharacterization: [],
    factsHash: 'a'.repeat(64),
    evaluatedAt: '2026-09-07T14:30:00.000Z',
  };

  it('ninguna sección expone flechas, códigos de ajuste ni siglas del marco, ni siquiera abiertas', async () => {
    backend({ accepted: true });
    server.use(
      mswHttp.get('*/diagnostics/:id/recommendation/trace', () => HttpResponse.json(TRACE)),
    );
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole('heading', { name: 'Consultoría Experta' });
    await user.click(screen.getByRole('button', { name: /Cómo se llegó a esta recomendación/ }));
    await user.click(screen.getByRole('button', { name: /Cómo se armó este plan/ }));
    await screen.findByText('Se dejó Consultoría Experta como primera opción');

    const deep = ['deep-imbalances', 'deep-roadmap', 'deep-recommendation'].map(
      (id) => document.getElementById(id)!.closest('section')!.textContent,
    );
    for (const text of deep) {
      expect(text).not.toMatch(/[→⇄⇔↔Δ≤≥]/);
      expect(text).not.toMatch(/\bE-?0\d\b/);
      expect(text).not.toMatch(/\b(TRL|CRL|BRL|IPRL|TmRL|FRL)\b/);
      expect(text).not.toMatch(/\b(FORCE|PROMOTE|DEMOTE|VETO|primary|secondary)\b/);
    }
  });

  it('no usa texto de tamaño de nota (text-xs) en la sección del análisis profundo', async () => {
    backend({ accepted: true });
    server.use(
      mswHttp.get('*/diagnostics/:id/recommendation/trace', () => HttpResponse.json(TRACE)),
    );
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole('heading', { name: 'Consultoría Experta' });
    await user.click(screen.getByRole('button', { name: /Cómo se llegó a esta recomendación/ }));
    await screen.findByText('Se dejó Consultoría Experta como primera opción');

    for (const id of ['deep-imbalances', 'deep-roadmap', 'deep-recommendation']) {
      const html = document.getElementById(id)!.closest('section')!.innerHTML;
      expect(html).not.toContain('text-xs');
      expect(html).not.toContain('text-[10px]');
    }
  });
});

describe('ResultsPage — estados de error y de carga', () => {
  it('muestra un estado de carga mientras espera el perfil', () => {
    server.use(
      mswHttp.get('*/diagnostics/:id/profile', () => new Promise(() => undefined)),
      mswHttp.get('*/diagnostics/:id', () => new Promise(() => undefined)),
    );

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando perfil…');
  });

  it('un diagnóstico sin perfil calculado dice qué falta', async () => {
    server.use(
      mswHttp.get('*/diagnostics/:id/profile', () => problem('CONFLICT', 409)),
      mswHttp.get('*/diagnostics/:id', () => HttpResponse.json(diagnostic(false))),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Completa primero el cuestionario');
  });

  it('si no se puede saber si aceptó el análisis, no adivina: avisa', async () => {
    server.use(
      mswHttp.get('*/diagnostics/:id/profile', () => HttpResponse.json(PROFILE)),
      mswHttp.get('*/diagnostics/:id', () => problem('NOT_FOUND', 404)),
    );

    renderPage();

    expect(
      await screen.findByText('No fue posible saber si aceptaste el análisis profundo'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Adquirir análisis profundo' }),
    ).not.toBeInTheDocument();
  });
});

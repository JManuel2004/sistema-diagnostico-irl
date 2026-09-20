import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { DimensionCode } from '@innlab/contracts';
import ResultsPage from '../ResultsPage';
import { renderWithClient } from '@/test/render-with-client';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { agroconectaRoadmapFixture } from '@/test/fixtures/roadmap';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CODES: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
// AgroConecta: TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2.
const LEVELS: Record<DimensionCode, number> = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 };

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const PROFILE = {
  diagnosticId: ID,
  computedAt: '2026-03-05T15:30:00.000Z',
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
  primary: { idService: 3, name: 'Consultoría', position: 1, score: 5.55 },
  justification: 'Atiende el riesgo legal más urgente del perfil.',
  noRecommendationReason: null,
  alternatives: [{ idService: 2, name: 'Mentoría', position: 2, score: 3.8 }],
  generatedAt: '2026-03-06T09:00:00.000Z',
};

function diagnostic(accepted: boolean, completed = true) {
  return {
    id: ID,
    userId: 'user-1',
    state: accepted ? 'DEEP_ANALYSIS_IN_PROGRESS' : completed ? 'PROFILE_GENERATED' : 'WITH_INITIATIVE',
    completed,
    deepAnalysisAccepted: accepted,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
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

  it('ofrece cerrar sesión', async () => {
    backend({ accepted: false });

    renderPage();

    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
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
      await screen.findByRole('heading', { name: 'Tu perfil de madurez IRL' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: /Cuello de botella/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Brecha/ })).toBeInTheDocument();
    // The six levels, in the legend that goes with the radar.
    const legend = screen.getByRole('list', { name: 'Leyenda del radar' });
    expect(within(legend).getAllByRole('button')).toHaveLength(6);
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
    expect(
      screen.queryByRole('heading', { name: 'Roadmap de escalamiento' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Recomendación de portafolio' }),
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
      await screen.findByRole('button', { name: 'Aceptar análisis profundo' }),
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
    await user.click(await screen.findByRole('button', { name: 'Aceptar análisis profundo' }));

    expect(
      await screen.findByRole('heading', { name: 'Desequilibrios y alertas' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Consultoría' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar análisis profundo' }),
    ).not.toBeInTheDocument();
  });

  it('avisa si no se pudo aceptar y deja reintentar', async () => {
    backend({ accepted: false });
    server.use(mswHttp.post('*/diagnostics/:id/deep-analysis', () => problem('INTERNAL', 500)));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Aceptar análisis profundo' }));

    expect(await screen.findByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No fue posible aceptar el análisis profundo',
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
    expect(screen.getByText(/5 de 6 pares fuera de balance/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Negocio está en estado crítico');
    expect(await screen.findByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Consultoría' })).toBeInTheDocument();
    // The profile is still there, on the same page.
    expect(screen.getByRole('heading', { name: 'Tu perfil de madurez IRL' })).toBeInTheDocument();
  });

  it('todo en una sola página: una vista, no pantallas separadas', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría' });
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(
      expect.arrayContaining([
        'Cómo leer estos resultados',
        'Desequilibrios y alertas',
        'Roadmap de escalamiento',
        'Recomendación de portafolio',
      ]),
    );
  });

  it('ya no ofrece aceptar el análisis profundo', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría' });
    expect(
      screen.queryByRole('button', { name: /Aceptar análisis profundo/ }),
    ).not.toBeInTheDocument();
  });

  // Backlog 10.3: every saved result carries its own date, in the same style.
  it('cada resultado guardado lleva su propia fecha: perfil, roadmap y recomendación', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría' });
    expect(screen.getByText(/Resultado guardado el 5 de marzo de 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado guardado el 8 de septiembre de 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado guardado el 6 de marzo de 2026/)).toBeInTheDocument();
  });

  it('reutiliza el panel plegable para el detalle: la explicación del roadmap y la traza', async () => {
    backend({ accepted: true });

    renderPage();

    await screen.findByRole('heading', { name: 'Consultoría' });
    expect(screen.getByRole('button', { name: /Cómo se construyó este roadmap/ })).toHaveAttribute(
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
    expect(await screen.findByRole('heading', { name: 'Consultoría' })).toBeInTheDocument();
  });

  it('si la recomendación no se generó, avisa y el roadmap sigue visible', async () => {
    backend({ accepted: true, recommendation: 'missing' });

    renderPage();

    expect(await screen.findByText(/No fue posible generar la recomendación/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
  });
});

describe('ResultsPage — explicabilidad para quien no conoce el marco (Oleada 4)', () => {
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

    expect(
      await screen.findByText(
        /Son seis: Tecnología, Cliente, Negocio, Propiedad Intelectual, Equipo, Financiación/,
      ),
    ).toBeInTheDocument();
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

    await user.hover(screen.getByRole('button', { name: /Desequilibrios/ }));
    expect((await screen.findAllByText(/deberían avanzar juntas/)).length).toBeGreaterThan(0);

    await user.hover(screen.getByRole('button', { name: /estado crítico/ }));
    expect((await screen.findAllByText(/dimensión clave del marco/)).length).toBeGreaterThan(0);
  });
});

describe('ResultsPage — el resumen y el radar están vinculados (Oleada 5)', () => {
  it('al pasar el cursor por una tarjeta se resalta su dimensión en la leyenda del radar', async () => {
    backend({ accepted: false });
    const user = userEvent.setup();

    renderPage();
    const card = await screen.findByRole('group', { name: /Cuello de botella/ });
    const legend = screen.getByRole('list', { name: 'Leyenda del radar' });
    const iprl = within(legend).getByRole('button', { name: /Propiedad Intelectual/ });
    expect(iprl).not.toHaveClass('border-border-strong');

    await user.hover(card);
    expect(iprl).toHaveClass('border-border-strong');
    expect(within(legend).getByRole('button', { name: /Tecnología/ })).not.toHaveClass(
      'border-border-strong',
    );

    await user.unhover(card);
    expect(iprl).not.toHaveClass('border-border-strong');
  });

  it('la tarjeta de brecha resalta todas las dimensiones en brecha', async () => {
    backend({ accepted: false });
    const user = userEvent.setup();

    renderPage();
    await user.hover(await screen.findByRole('group', { name: /Brecha/ }));

    const legend = screen.getByRole('list', { name: 'Leyenda del radar' });
    for (const name of [/Negocio/, /Propiedad Intelectual/, /Financiación/]) {
      expect(within(legend).getByRole('button', { name })).toHaveClass('border-border-strong');
    }
    expect(within(legend).getByRole('button', { name: /Tecnología/ })).not.toHaveClass(
      'border-border-strong',
    );
  });

  it('un clic en la leyenda fija la dimensión aunque el cursor salga', async () => {
    backend({ accepted: false });
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole('group', { name: /Cuello de botella/ });
    const legend = screen.getByRole('list', { name: 'Leyenda del radar' });
    const cliente = within(legend).getByRole('button', { name: /Cliente/ });

    await user.click(cliente);
    await user.unhover(cliente);
    expect(cliente).toHaveAttribute('aria-pressed', 'true');
    expect(cliente).toHaveClass('border-border-strong');

    await user.click(cliente);
    expect(cliente).toHaveAttribute('aria-pressed', 'false');
  });

  it('con el análisis profundo, pasar por un par o una alerta resalta sus dimensiones', async () => {
    backend({ accepted: true });
    const user = userEvent.setup();

    renderPage();
    await user.hover(await screen.findByRole('alert'));

    const legend = screen.getByRole('list', { name: 'Leyenda del radar' });
    expect(within(legend).getByRole('button', { name: /Negocio/ })).toHaveClass(
      'border-border-strong',
    );
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
      screen.queryByRole('button', { name: 'Aceptar análisis profundo' }),
    ).not.toBeInTheDocument();
  });
});

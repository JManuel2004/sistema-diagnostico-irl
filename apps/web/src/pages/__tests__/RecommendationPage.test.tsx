import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import RecommendationPage from '../RecommendationPage';
import { renderWithClient } from '@/test/render-with-client';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const BASE = '*/diagnostics/:id/recommendation';
const DEEP_ANALYSIS = '*/diagnostics/:id/deep-analysis';
const ACEPTADO = {
  diagnosticId: DIAGNOSTIC_ID,
  state: 'DEEP_ANALYSIS_IN_PROGRESS' as const,
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const RECOMENDACION = {
  diagnosticId: DIAGNOSTIC_ID,
  resultType: 'RECOMMENDATION' as const,
  primary: { idService: 3, name: 'Consultoría', position: 1, score: 5.55 },
  justification: 'Atiende el riesgo legal más urgente del perfil.',
  noRecommendationReason: null,
  alternatives: [
    { idService: 2, name: 'Mentoría', position: 2, score: 3.8 },
  ],
  generatedAt: '2026-09-07T14:30:00.000Z',
};

function problema(code: string, status: number, detail: string) {
  return HttpResponse.json(
    {
      type: `https://errors.innlab.icesi.edu.co/${code.toLowerCase()}`,
      title: code.replace(/_/g, ' ').toLowerCase(),
      status,
      detail,
      code,
    },
    { status },
  );
}

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={[`/diagnosticos/${DIAGNOSTIC_ID}/recommendation`]}>
      <Routes>
        <Route
          path="/diagnosticos/:id/recommendation"
          element={<RecommendationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RecommendationPage', () => {
  it('muestra la recomendación persistida', async () => {
    server.use(mswHttp.get(BASE, () => HttpResponse.json(RECOMENDACION)));

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/riesgo legal más urgente/)).toBeInTheDocument();
  });

  /**
   * Simula el backend real: la recomendación no existe (409) hasta que se
   * acepta el análisis profundo, momento en que `routing/` la calcula y
   * persiste como reacción al evento.
   */
  function backendQueCalculaAlAceptar(opts: { calculaRecomendacion: boolean }) {
    const estado = { aceptaciones: 0, calculada: false };
    server.use(
      mswHttp.get(BASE, () =>
        estado.calculada
          ? HttpResponse.json(RECOMENDACION)
          : problema(
              'ROUTING_RECOMMENDATION_NOT_GENERATED',
              409,
              'Todavía no tiene recomendación generada.',
            ),
      ),
      mswHttp.post(DEEP_ANALYSIS, () => {
        estado.aceptaciones += 1;
        if (opts.calculaRecomendacion) estado.calculada = true;
        return HttpResponse.json(ACEPTADO, { status: 201 });
      }),
    );
    return estado;
  }

  const BOTON_ACEPTAR = { name: 'Aceptar análisis profundo' };

  // Backlog 4.6: aceptar el análisis profundo cambia el estado del diagnóstico
  // y dispara el cálculo; no puede ser un efecto de navegar a la URL.
  it('no acepta el análisis profundo al entrar: ofrece un botón y espera al usuario', async () => {
    const estado = backendQueCalculaAlAceptar({ calculaRecomendacion: true });

    renderPage();

    expect(await screen.findByRole('button', BOTON_ACEPTAR)).toBeInTheDocument();
    // Damos tiempo a que un envío automático, si existiera, ocurriera.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(estado.aceptaciones).toBe(0);
    expect(screen.queryByRole('heading', { name: 'Consultoría' })).not.toBeInTheDocument();
  });

  it('al pulsar el botón acepta el análisis y muestra la recomendación', async () => {
    const estado = backendQueCalculaAlAceptar({ calculaRecomendacion: true });

    renderPage();
    await userEvent.click(await screen.findByRole('button', BOTON_ACEPTAR));

    expect(await screen.findByRole('heading', { name: 'Consultoría' })).toBeInTheDocument();
    expect(estado.aceptaciones).toBe(1);
  });

  it('ya no dispara el cálculo de routing/ directamente', async () => {
    let postsDirectos = 0;
    backendQueCalculaAlAceptar({ calculaRecomendacion: true });
    server.use(
      mswHttp.post(BASE, () => {
        postsDirectos += 1;
        return HttpResponse.json(RECOMENDACION, { status: 201 });
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole('button', BOTON_ACEPTAR));
    await screen.findByRole('heading', { name: 'Consultoría' });

    expect(postsDirectos).toBe(0);
  });

  it('muestra un estado de carga mientras el análisis está en curso', async () => {
    let resolvePost!: () => void;
    let calculada = false;
    server.use(
      mswHttp.get(BASE, () =>
        calculada
          ? HttpResponse.json(RECOMENDACION)
          : problema('ROUTING_RECOMMENDATION_NOT_GENERATED', 409, 'aún no'),
      ),
      mswHttp.post(
        DEEP_ANALYSIS,
        () =>
          new Promise<Response>((resolve) => {
            resolvePost = () => {
              calculada = true;
              resolve(HttpResponse.json(ACEPTADO, { status: 201 }));
            };
          }),
      ),
    );

    renderPage();
    await userEvent.click(await screen.findByRole('button', BOTON_ACEPTAR));

    await screen.findByText('Generando recomendación…');
    expect(screen.queryByRole('button', BOTON_ACEPTAR)).not.toBeInTheDocument();

    resolvePost();

    expect(await screen.findByRole('heading', { name: 'Consultoría' })).toBeInTheDocument();
  });

  it('avisa cuando el análisis se acepta pero el cálculo de routing/ falló, y deja reintentar', async () => {
    // Los listeners son independientes: un fallo de `routing/` (p. ej. sin
    // configuración activa) no hace fallar la aceptación; se ve porque,
    // tras aceptar, la recomendación sigue sin existir.
    const estado = backendQueCalculaAlAceptar({ calculaRecomendacion: false });

    renderPage();
    await userEvent.click(await screen.findByRole('button', BOTON_ACEPTAR));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'No fue posible generar la recomendación',
      );
    });
    expect(estado.aceptaciones).toBe(1);

    // Con un fallo el usuario decide reintentar; nada se reenvía solo.
    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    await waitFor(() => expect(estado.aceptaciones).toBe(2));
  });

  it('avisa cuando el diagnóstico aún no puede aceptar el análisis profundo', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        problema('ROUTING_RECOMMENDATION_NOT_GENERATED', 409, 'aún no'),
      ),
      mswHttp.post(DEEP_ANALYSIS, () =>
        problema('CONFLICT', 409, 'Deep analysis cannot be requested'),
      ),
    );

    renderPage();
    await userEvent.click(await screen.findByRole('button', BOTON_ACEPTAR));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'aún no tiene un perfil de madurez calculado',
      );
    });
  });

  it('distingue la falta de configuración active de un error genérico', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        problema(
          'ROUTING_NO_ACTIVE_CONFIGURATION',
          409,
          'No hay versión active.',
        ),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'No hay una configuración de enrutamiento active',
      );
    });
  });

  it('avisa cuando el diagnóstico no tiene perfil calculado', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        problema('ROUTING_PROFILE_NOT_COMPUTED', 409, 'sin perfil'),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'aún no tiene un perfil de madurez calculado',
      );
    });
  });

  it('carga la trace solo cuando se despliega el panel', async () => {
    let pedidosDeTraza = 0;
    server.use(
      mswHttp.get(`${BASE}/trace`, () => {
        pedidosDeTraza += 1;
        return HttpResponse.json({
          diagnosticId: DIAGNOSTIC_ID,
          layer1Excluded: [],
          rankingBeforeExceptions: [],
          appliedExceptions: [],
          discardedExceptions: [],
          rankingAfterExceptions: [],
          adjustedByException: false,
          incompleteCharacterization: [],
          factsHash: 'a'.repeat(64),
          evaluatedAt: '2026-09-07T14:30:00.000Z',
        });
      }),
      mswHttp.get(BASE, () => HttpResponse.json(RECOMENDACION)),
    );

    renderPage();
    await screen.findByRole('heading', { name: 'Consultoría' });

    expect(pedidosDeTraza).toBe(0);

    await userEvent.click(
      screen.getByRole('button', { name: /Cómo se llegó a esta recomendación/ }),
    );

    await waitFor(() => expect(pedidosDeTraza).toBe(1));
  });
});

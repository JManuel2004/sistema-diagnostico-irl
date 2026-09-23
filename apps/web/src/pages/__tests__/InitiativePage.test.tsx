import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toast } from 'sonner';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import InitiativePage from '../InitiativePage';
import { renderWithClient } from '@/test/render-with-client';
import { SECTORS, STAGES, initiativeFixture } from '@/test/fixtures/initiative';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function notFound() {
  return HttpResponse.json(
    {
      type: 'x',
      title: 'not found',
      status: 404,
      detail: 'Initiative not found',
      code: 'NOT_FOUND',
    },
    { status: 404 },
  );
}

function backend(existing: ReturnType<typeof initiativeFixture> | null = null) {
  const posted: unknown[] = [];
  server.use(
    mswHttp.get('*/initiative-catalog/sectors', () => HttpResponse.json(SECTORS)),
    mswHttp.get('*/initiative-catalog/stages', () => HttpResponse.json(STAGES)),
    mswHttp.get('*/diagnostics/:id/initiative', () =>
      existing ? HttpResponse.json(existing) : notFound(),
    ),
    mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
    mswHttp.post('*/diagnostics/:id/initiative', async ({ request }) => {
      posted.push(await request.json());
      return HttpResponse.json(initiativeFixture(), { status: 201 });
    }),
  );
  return posted;
}

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={[`/diagnosticos/${ID}/iniciativa`]}>
      <Routes>
        <Route path="/diagnosticos/:id/iniciativa" element={<InitiativePage />} />
        <Route path="/diagnosticos/:id/asistente" element={<div>ASISTENTE_STUB</div>} />
        <Route path="/panel" element={<div>PANEL_STUB</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InitiativePage — corregir la iniciativa ya registrada (HU-06)', () => {
  it('trae la iniciativa registrada, con los catálogos, para editarla', async () => {
    backend(initiativeFixture({ name: 'AgroConecta v2' }));

    renderPage();

    const name = await screen.findByLabelText('Nombre de la iniciativa');
    await waitFor(() => {
      expect(name).toHaveValue('AgroConecta v2');
    });
    expect(screen.getByLabelText('Sector')).toHaveValue('1');
    expect(screen.getByLabelText('Etapa')).toHaveValue('2');
    expect(screen.getByLabelText('Personas en el equipo')).toHaveValue(3);
    expect(screen.getByRole('option', { name: 'Agroindustria / AgriTech' })).toBeInTheDocument();
  });

  it('al guardar actualiza la iniciativa y vuelve al panel', async () => {
    const posted = backend(initiativeFixture());
    const user = userEvent.setup();

    renderPage();
    const name = await screen.findByLabelText('Nombre de la iniciativa');
    await waitFor(() => {
      expect(name).toHaveValue('AgroConecta');
    });
    await user.clear(name);
    await user.type(name, 'AgroConecta v2');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('PANEL_STUB')).toBeInTheDocument();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ name: 'AgroConecta v2', sectorId: '1', stageId: '2', teamSize: 3 });
  });

  it('el primer registro es el paso 1 del asistente: sin iniciativa se manda allí', async () => {
    backend();

    renderPage();

    expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
  });

  it('todos los campos siguen siendo obligatorios al corregir', async () => {
    const posted = backend(initiativeFixture());
    const user = userEvent.setup();

    renderPage();
    const name = await screen.findByLabelText('Nombre de la iniciativa');
    await waitFor(() => {
      expect(name).toHaveValue('AgroConecta');
    });
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(posted).toHaveLength(0);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument();
  });

  it('avisa si no se pudo guardar y conserva lo escrito', async () => {
    backend(initiativeFixture());
    server.use(
      mswHttp.post('*/diagnostics/:id/initiative', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();

    renderPage();
    const name = await screen.findByLabelText('Nombre de la iniciativa');
    await waitFor(() => {
      expect(name).toHaveValue('AgroConecta');
    });
    await user.type(name, ' v2');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('No fue posible guardar la iniciativa'),
      );
    });
    expect(name).toHaveValue('AgroConecta v2');
  });

  it('avisa si no se pudo cargar el formulario', async () => {
    server.use(
      mswHttp.get('*/initiative-catalog/sectors', () =>
        HttpResponse.json({ message: 'x' }, { status: 500 }),
      ),
      mswHttp.get('*/initiative-catalog/stages', () => HttpResponse.json(STAGES)),
      mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
    );

    renderPage();

    expect(await screen.findByText('No fue posible cargar el formulario')).toBeInTheDocument();
  });

  it('lleva la navegación principal, con el descriptor hacia el panel', async () => {
    backend(initiativeFixture());

    renderPage();

    expect(await screen.findByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toHaveAttribute(
      'href',
      '/panel',
    );
  });
});

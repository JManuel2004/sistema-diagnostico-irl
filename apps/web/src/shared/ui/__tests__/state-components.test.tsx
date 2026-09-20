import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Alert } from '../alert';
import { LoadingState } from '../loading-state';
import { ResultMeta } from '../result-meta';
import { PageHeader } from '../page-header';
import { DisclosurePanel } from '../disclosure-panel';
import { AcceptDeepAnalysisCard } from '../accept-deep-analysis-card';

describe('Alert', () => {
  it('un error crítico se anuncia como alert y trae título y texto', () => {
    render(
      <Alert tone="critical" title="No fue posible">
        Intenta de nuevo.
      </Alert>,
    );

    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('No fue posible');
    expect(alerta).toHaveTextContent('Intenta de nuevo.');
  });

  it('los demás tonos son un status, no interrumpen', () => {
    render(<Alert tone="moderate" title="Ojo" />);

    expect(screen.getByRole('status')).toHaveTextContent('Ojo');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el color nunca es la única señal: cada tono lleva icono', () => {
    const { container } = render(<Alert tone="acceptable" title="Listo" />);

    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('admite una acción propia del mensaje', () => {
    render(<Alert title="Falló" action={<button type="button">Reintentar</button>} />);

    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('LoadingState', () => {
  it('es un status con el texto de lo que se espera', () => {
    render(<LoadingState label="Cargando perfil…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando perfil…');
  });
});

describe('ResultMeta', () => {
  it('dice que es un resultado guardado, con la fecha en español', () => {
    render(<ResultMeta savedAt="2026-03-05T15:30:00.000Z" />);

    expect(screen.getByText(/Resultado guardado el 5 de marzo de 2026/)).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('pone el título como h1 y admite un metadato debajo', () => {
    render(
      <PageHeader overline="Análisis" title="Mi pantalla" description="Descripción">
        <ResultMeta savedAt="2026-03-05T15:30:00.000Z" />
      </PageHeader>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Mi pantalla' })).toHaveClass('text-h1');
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText(/Resultado guardado/)).toBeInTheDocument();
  });
});

describe('DisclosurePanel', () => {
  it('arranca plegado y avisa al abrir, no al cerrar', async () => {
    const onOpen = vi.fn();
    render(
      <DisclosurePanel id="panel" title="Cómo se llegó" tag="Detalle" onOpen={onOpen}>
        <p>Contenido</p>
      </DisclosurePanel>,
    );
    const boton = screen.getByRole('button', { name: /Cómo se llegó/ });

    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(onOpen).not.toHaveBeenCalled();

    await userEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(onOpen).toHaveBeenCalledTimes(1);

    await userEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('AcceptDeepAnalysisCard', () => {
  it('ofrece aceptar y ejecuta la acción solo al pulsar', async () => {
    const onAccept = vi.fn();
    render(
      <MemoryRouter>
        <AcceptDeepAnalysisCard onAccept={onAccept} failed={false} />
      </MemoryRouter>,
    );
    expect(onAccept).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Aceptar análisis profundo' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('tras un fallo el botón pasa a «Intentar de nuevo»', () => {
    render(<AcceptDeepAnalysisCard onAccept={vi.fn()} failed />);

    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
  });
});

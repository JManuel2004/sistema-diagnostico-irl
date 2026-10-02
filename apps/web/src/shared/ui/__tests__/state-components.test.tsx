import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Alert } from '../alert';
import { LoadingState } from '../loading-state';
import { ProcessingState } from '../processing-state';
import { ResultMeta } from '../result-meta';
import { PageHeader } from '../page-header';
import { DisclosurePanel } from '../disclosure-panel';
import { AcceptDeepAnalysisCard, RetryDeepAnalysisCard } from '../accept-deep-analysis-card';

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

describe('ProcessingState', () => {
  it('anuncia qué se está calculando, con título y explicación', () => {
    render(
      <ProcessingState
        overline="Diagnóstico"
        title="Estamos armando tu perfil"
        description="En un momento verás el resultado."
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Diagnóstico');
    expect(status).toHaveTextContent('Estamos armando tu perfil');
    expect(status).toHaveTextContent('En un momento verás el resultado.');
    expect(screen.getByRole('heading', { level: 2, name: 'Estamos armando tu perfil' })).toBeInTheDocument();
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
    const button = screen.getByRole('button', { name: /Cómo se llegó/ });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(onOpen).not.toHaveBeenCalled();

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(onOpen).toHaveBeenCalledTimes(1);

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('AcceptDeepAnalysisCard', () => {
  function renderCard(props: Partial<Parameters<typeof AcceptDeepAnalysisCard>[0]> = {}) {
    return render(
      <MemoryRouter>
        <AcceptDeepAnalysisCard onAccept={vi.fn()} failed={false} {...props} />
      </MemoryRouter>,
    );
  }

  it('la invita a profundizar el diagnóstico de la iniciativa, por su nombre', () => {
    renderCard({ subject: 'AgroConecta' });

    expect(
      screen.getByRole('heading', { name: '¿Quieres profundizar el diagnóstico de AgroConecta?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Conecta AgroConecta con una ruta de acompañamiento' }),
    ).toBeInTheDocument();
  });

  it('promociona el análisis con lo que incluye, a la vista', () => {
    renderCard();

    expect(screen.getByText(/Análisis profundo · Recomendado/)).toBeInTheDocument();
    for (const item of [
      /desequilibrios entre seis pares/i,
      /Alertas de las dimensiones clave/i,
      /plan de escalamiento por fases/i,
      /recomendación del servicio de INNLAB/i,
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('ofrece aceptar y ejecuta la acción solo al pulsar', async () => {
    const onAccept = vi.fn();
    renderCard({ onAccept });
    expect(onAccept).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Adquirir análisis profundo' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('dice que el análisis profundo es de pago antes de pedirlo', () => {
    renderCard({});

    expect(screen.getByText('De pago')).toBeInTheDocument();
  });

  it('tras un fallo el botón pasa a «Intentar de nuevo»', () => {
    renderCard({ failed: true });

    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adquirir análisis profundo' })).not.toBeInTheDocument();
  });

  it('ofrece el otro camino, «por ahora no», sin ejecutar nada: lleva al panel', () => {
    const onAccept = vi.fn();
    renderCard({ onAccept });

    expect(screen.getByText('Por ahora no')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute('href', '/panel');
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('dice que es voluntario y que puede pedirse cuando se quiera', () => {
    renderCard();

    expect(screen.getByText(/El análisis profundo es voluntario/)).toBeInTheDocument();
  });

  it('no promete un registro de la decisión ni afirma un precio que el sistema no maneja', () => {
    const { container } = renderCard();

    expect(container.textContent).not.toMatch(/gratuito|costo|precio|registrada como parte/i);
  });
});

describe('RetryDeepAnalysisCard', () => {
  it('pide volver a intentar el cálculo y solo lo ejecuta al pulsar', async () => {
    const onRetry = vi.fn();
    render(<RetryDeepAnalysisCard onRetry={onRetry} />);
    expect(onRetry).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

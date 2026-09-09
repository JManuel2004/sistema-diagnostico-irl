import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TrazaCapasResponse } from '@innlab/contracts';
import { LayerTracePanel } from '../LayerTracePanel';
import { RecommendationSummary } from '../RecommendationSummary';

const APORTES = {
  cuelloBotella: {
    valor: 1.5,
    detalle: [{ dimension: 'IPRL', etiquetaOrigen: 'secundario', valor: 0.5 }],
  },
  brechas: {
    valor: 3,
    detalle: [
      { dimension: 'BRL', etiquetaOrigen: 'principal', valor: 1 },
      { dimension: 'FRL', etiquetaOrigen: 'no_aplica', valor: 0 },
    ],
  },
  desequilibrios: {
    valor: 2.25,
    detalle: [
      {
        par: 'TRL-IPRL',
        clasificacion: 'CRITICO',
        etiquetaOrigen: 'secundario',
        valor: 0.5,
      },
    ],
  },
  afinidadEtapa: { valor: 0.8, coincide: true },
  penalizacionRango: { valor: 2, aplicada: true },
};

function traza(over: Partial<TrazaCapasResponse> = {}): TrazaCapasResponse {
  return {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    excluidosCapa1: [
      {
        idServicio: 6,
        nombre: 'Proyectos de Grado',
        mensajeExclusion: 'Requieren vinculación académica confirmada.',
      },
    ],
    rankingPreExcepcion: [
      {
        posicion: 1,
        idServicio: 3,
        nombre: 'Consultoría',
        puntaje: 5.55,
        aportes: APORTES,
      },
    ],
    excepcionesActivadas: [
      {
        codigo: 'E-01',
        orden: 1,
        accion: 'FORZAR',
        servicioObjetivo: 'Consultoría',
        motivoDeclarado: 'Un riesgo legal crítico requiere asesoría especializada.',
        rankingAntes: [],
        rankingDespues: [],
        efecto: 'Consultoría ya ocupaba el puesto 1',
      },
    ],
    excepcionesDescartadas: [
      { codigo: 'E-02', orden: 2, razon: 'La condición no se cumple' },
    ],
    rankingPostExcepcion: [],
    ajustadoPorExcepcion: false,
    caracterizacionIncompleta: [],
    versionConfiguracion: 1,
    snapshotCalibracion: 1,
    snapshotParametros: 1,
    hashHechos: 'a'.repeat(64),
    evaluadoEn: '2026-09-07T14:30:00.000Z',
    ...over,
  };
}

describe('LayerTracePanel', () => {
  it('arranca colapsado y no pide la traza hasta que se abre', () => {
    const onOpen = vi.fn();
    render(<LayerTracePanel traza={undefined} isLoading={false} onOpen={onOpen} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('avisa al abrirse para que la traza se cargue solo entonces', async () => {
    const onOpen = vi.fn();
    render(<LayerTracePanel traza={undefined} isLoading={false} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('explica los aportes en vocabulario ordinal, sin exponer los puntajes', async () => {
    render(<LayerTracePanel traza={traza()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    const panel = document.getElementById('traza-capas')!;
    expect(panel.textContent).toContain('IPRL: secundario');
    expect(panel.textContent).toContain('BRL (principal)');
    // El número de la calibración es un detalle interno: mostrarlo
    // desplazaría la conversación al valor en vez de a la recomendación.
    expect(panel.textContent).not.toContain('5.55');
    expect(panel.textContent).not.toContain('1.5');
  });

  it('omite las dimensiones que el servicio no atiende', async () => {
    render(<LayerTracePanel traza={traza()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    expect(document.getElementById('traza-capas')!.textContent).not.toContain(
      'FRL',
    );
  });

  it('muestra el motivo declarado del ajuste que se aplicó', async () => {
    render(<LayerTracePanel traza={traza()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/E-01 · FORZAR Consultoría/)).toBeInTheDocument();
    expect(
      screen.getByText(/riesgo legal crítico requiere asesoría/),
    ).toBeInTheDocument();
  });

  it('avisa cuando el resultado viene de un ajuste y no del cálculo', async () => {
    // Es la línea que separa un sistema auditable de uno que parece
    // objetivo sin serlo.
    render(
      <LayerTracePanel
        traza={traza({ ajustadoPorExcepcion: true })}
        isLoading={false}
        onOpen={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('status').textContent).toContain(
      'ajuste puntual del centro, no del resultado del cálculo',
    );
  });

  it('no muestra ese aviso cuando el servicio ganó el cálculo', async () => {
    render(<LayerTracePanel traza={traza()} isLoading={false} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('señala cuando faltaron datos de caracterización', async () => {
    render(
      <LayerTracePanel
        traza={traza({ caracterizacionIncompleta: ['etapa', 'tamanoEquipo'] })}
        isLoading={false}
        onOpen={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button'));

    expect(
      screen.getByText(/no tiene registrados etapa, tamanoEquipo/),
    ).toBeInTheDocument();
  });
});

describe('RecommendationSummary', () => {
  const base = {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    versionConfiguracion: 1,
    generadaEn: '2026-09-07T14:30:00.000Z',
  } as const;

  it('presenta el servicio y su justificación sin mostrar puntajes', () => {
    render(
      <RecommendationSummary
        recomendacion={{
          ...base,
          resultadoTipo: 'RECOMENDACION',
          principal: {
            idServicio: 3,
            nombre: 'Consultoría',
            posicion: 1,
            puntaje: 5.55,
          },
          justificacion: 'Atiende el riesgo legal más urgente del perfil.',
          motivoSinRecomendacion: null,
          alternativas: [
            { idServicio: 2, nombre: 'Mentoría', posicion: 2, puntaje: 3.8 },
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
        recomendacion={{
          ...base,
          resultadoTipo: 'SIN_RECOMENDACION',
          principal: null,
          justificacion: null,
          motivoSinRecomendacion:
            'Ningún servicio alcanzó la pertinencia mínima para este perfil.',
          alternativas: [],
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /Sin recomendación/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pertinencia mínima/)).toBeInTheDocument();
  });
});

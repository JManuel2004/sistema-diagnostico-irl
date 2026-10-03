import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  dimensionRefFixture,
  dimensionResultFixture,
  levelScaleFixture,
} from '@/test/fixtures/dimensions';
import {
  agroconectaRoadmapFixture,
  phaseTraceFixture,
  roadmapDimensionFixture,
} from '@/test/fixtures/roadmap';
import { RoadmapPhaseList } from '../RoadmapPhaseList';
import { RoadmapExplanationPanel } from '../RoadmapExplanationPanel';
import userEvent from '@testing-library/user-event';

const AGROCONECTA = agroconectaRoadmapFixture();
const NAMES = {
  TRL: 'Tecnología',
  CRL: 'Cliente',
  BRL: 'Negocio',
  IPRL: 'Propiedad Intelectual',
  TmRL: 'Equipo',
  FRL: 'Financiación',
};

// AgroConecta today: the route starts from here.
const TODAY = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 } as const;
const classify = (d: number) => (d > 3 ? 'critical' : d >= 2 ? 'moderate' : 'acceptable');
const PAIRS = [
  ['TRL', 'CRL'],
  ['TRL', 'BRL'],
  ['CRL', 'BRL'],
  ['TmRL', 'FRL'],
  ['BRL', 'IPRL'],
  ['TRL', 'IPRL'],
] as const;
const PROFILE = {
  dimensionResults: (Object.keys(TODAY) as (keyof typeof TODAY)[]).map((code) =>
    dimensionResultFixture(code, TODAY[code]),
  ),
  globalAverage: 3.5,
  imbalances: PAIRS.map(([left, right]) => {
    const difference = Math.abs(TODAY[left] - TODAY[right]);
    return { left, right, difference, classification: classify(difference) } as const;
  }),
};

const phaseOf = (n: number) =>
  screen.getByRole('heading', { level: 3, name: `Fase ${String(n)}` }).closest('li')!;

describe('RoadmapPhaseList', () => {
  it('muestra las tres fases del caso AgroConecta', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    expect(screen.getByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fase 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fase 3' })).toBeInTheDocument();
  });

  it('presenta las dimensiones de una fase como paralelas, no como jerarquía', () => {
    // The order within a phase is canonical so the response is
    // deterministic; it is not a priority.
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    expect(screen.getAllByText(/2 dimensiones se trabajan al mismo tiempo/)).toHaveLength(2);
    expect(screen.queryByText(/1 dimensiones se trabajan/)).not.toBeInTheDocument();
  });

  it('muestra de qué nivel a qué nivel va cada dimensión en la fase, en palabras y en una barra', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    const business = within(phaseOf(2))
      .getByRole('heading', { name: 'Negocio' })
      .closest('article')!;
    expect(business).toHaveTextContent('De nivel 3 a nivel 5');
    expect(
      within(business).getByRole('img', { name: 'Nivel 3 de 9, con meta en el nivel 5' }),
    ).toBeInTheDocument();
  });

  it('una subida que pasa del límite por fase dice que sigue en la próxima', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    const pi = within(phaseOf(1))
      .getByRole('heading', { name: 'Propiedad Intelectual' })
      .closest('article')!;
    expect(pi).toHaveTextContent('De nivel 1 a nivel 3');
    expect(pi).toHaveTextContent(
      'En esta fase sube hasta el nivel 3; sigue en la próxima fase hasta el 5.',
    );
  });

  it('explica qué significa el nivel al que llega cada dimensión', () => {
    render(
      <RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} levelScale={levelScaleFixture()} />,
    );

    const financing = within(phaseOf(3))
      .getByRole('heading', { name: 'Financiación' })
      .closest('article')!;
    expect(financing).toHaveTextContent(
      'Al llegar al nivel 4: Qué significa el nivel 4 en Financiación.',
    );
  });

  it('explica qué desbloquea cada dimensión, para que el orden sea refutable', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    const client = within(phaseOf(1)).getByRole('heading', { name: 'Cliente' }).closest('article')!;
    expect(
      within(client).getByText(/Al llegar a su meta, Negocio y Financiación podrán avanzar/),
    ).toBeInTheDocument();
    const financing = within(phaseOf(3))
      .getByRole('heading', { name: 'Financiación' })
      .closest('article')!;
    expect(within(financing).queryByText(/podrá avanzar|podrán avanzar/)).toBeNull();
  });

  it('dice por qué una dimensión está en el plan y qué fija su meta final', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    const financing = within(phaseOf(3))
      .getByRole('heading', { name: 'Financiación' })
      .closest('article')!;
    expect(financing).toHaveTextContent('debería llegar al menos al nivel 4');
    expect(financing).toHaveTextContent('La meta es el nivel que se espera de ella: 4');
    // Cliente meets its minimum and only rises to keep up with Tecnología.
    const client = within(phaseOf(1)).getByRole('heading', { name: 'Cliente' }).closest('article')!;
    expect(client).toHaveTextContent(
      'Ya cumple lo que se espera, pero quedaría muy lejos de Tecnología: sube para que al final no quede un desequilibrio.',
    );
    expect(client).toHaveTextContent(
      'Su meta es el nivel 5, a un nivel de Tecnología, para que las dos avancen parejas.',
    );
  });

  it('dice cuando una dimensión entra porque otra la necesita, y quién fija su meta', () => {
    const roadmap = {
      ...AGROCONECTA,
      phases: [
        {
          order: 1,
          dimensions: [
            roadmapDimensionFixture('TmRL', {
              currentLevel: 4,
              targetLevel: 6,
              enables: ['BRL', 'FRL'],
              inclusionReason: 'REQUIRED_ENABLER',
              targetReason: 'ENABLES',
              expectedMinimum: 4,
              targetDrivenBy: dimensionRefFixture('BRL'),
            }),
          ],
          service: null,
          serviceTrace: phaseTraceFixture(),
        },
      ],
    };
    render(<RoadmapPhaseList profile={PROFILE} roadmap={roadmap} />);

    const team = screen.getByRole('heading', { name: 'Equipo' }).closest('article')!;
    expect(team).toHaveTextContent(
      'Ya cumple lo que se espera, pero Negocio y Financiación necesitan que suba para poder avanzar.',
    );
    expect(team).toHaveTextContent(
      'Negocio necesita que llegue al nivel 6, por eso esa es su meta.',
    );
    // No service available for the phase: said plainly.
    expect(
      screen.getByText(/Ningún servicio del portafolio está disponible para esta fase/),
    ).toBeInTheDocument();
  });

  it('cada fase propone un servicio con su ficha, del más liviano al más profundo', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    const names = [1, 2, 3].map(
      (n) =>
        within(phaseOf(n)).getByRole('heading', { level: 4, name: /Reto|Semillero/ }).textContent,
    );
    expect(names).toEqual(['Reto Express', 'Reto en el Aula', 'Semillero con Propósito']);
    const second = phaseOf(2);
    expect(second).toHaveTextContent('Proyectos académicos integradores (pregrado y posgrado)');
    expect(second).toHaveTextContent('Nivel: Co-crea');
    expect(second).toHaveTextContent('IRL global 4 a 6');
    expect(second).toHaveTextContent('Qué puede lograr');
  });

  it('cuando ningún servicio atiende bien la fase, muestra el más cercano y lo dice', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    expect(phaseOf(3)).toHaveTextContent(
      'Ningún servicio del portafolio atiende bien esta fase. Este es el más cercano',
    );
    expect(phaseOf(2)).not.toHaveTextContent('Este es el más cercano');
  });

  it('explica por qué se propone cada servicio, en palabras', async () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    await userEvent.click(within(phaseOf(1)).getByText('¿Por qué este servicio?'));
    expect(phaseOf(1)).toHaveTextContent(
      'Es el servicio que te recomendamos para tu perfil actual',
    );
    await userEvent.click(within(phaseOf(2)).getByText('¿Por qué este servicio?'));
    expect(phaseOf(2)).toHaveTextContent(
      'Trabaja Negocio como apoyo, que en esta fase sube 2 niveles.',
    );
    expect(phaseOf(2)).toHaveTextContent('La ruta no repite servicios');
  });

  it('compara cómo quedan las dimensiones al terminar la ruta con cómo están hoy', () => {
    render(
      <RoadmapPhaseList
        profile={PROFILE}
        roadmap={AGROCONECTA}
        dimensionNames={NAMES}
        subject="AgroConecta"
      />,
    );

    const end = screen
      .getByRole('heading', { name: 'AgroConecta avanza pareja' })
      .closest('section')!;
    expect(end).toHaveTextContent(
      'ninguna pareja de dimensiones queda con un desequilibrio que genere alerta',
    );
    expect(
      within(end).getByRole('img', { name: 'Cliente: hoy nivel 4, al terminar nivel 5' }),
    ).toBeInTheDocument();
    expect(
      within(end).getByRole('img', { name: 'Financiación: hoy nivel 2, al terminar nivel 4' }),
    ).toBeInTheDocument();
    // 5 pairs with an alert today, none at the end; the global level goes from 3,5 to 5.
    const alerts = within(end).getByText('Desequilibrios con alerta').closest('div')!;
    expect(alerts).toHaveTextContent('Hoy5');
    expect(alerts).toHaveTextContent('Al terminar0');
    expect(within(end).getByText('Nivel IRL global').closest('div')).toHaveTextContent(
      'Hoy3,5Al terminar5',
    );
    expect(within(end).getByText('Dimensiones que suben').closest('div')).toHaveTextContent(
      '4 de 6',
    );
  });

  it('al pasar por una pareja, deja encendidas solo sus dos dimensiones', async () => {
    const user = userEvent.setup();
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} dimensionNames={NAMES} />);

    const pair = screen.getByRole('button', { name: /Tecnología y Propiedad Intelectual/ });
    expect(pair).toHaveTextContent('Hoy 5, crítico');
    expect(pair).toHaveTextContent('Al final 1');

    await user.hover(pair);

    const row = (name: RegExp) => screen.getByRole('img', { name }).closest('li')!;
    expect(row(/^Cliente:/)).toHaveClass('opacity-30');
    expect(row(/^Tecnología:/)).not.toHaveClass('opacity-30');
    expect(row(/^Propiedad Intelectual:/)).not.toHaveClass('opacity-30');
  });

  it('nombra las dimensiones que quedaron fuera del plan', () => {
    render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    expect(screen.getByText(/Tecnología, Equipo ya alcanzan/)).toBeInTheDocument();
  });

  it('un roadmap vacío se presenta como resultado, no como error', () => {
    render(
      <RoadmapPhaseList
        profile={PROFILE}
        roadmap={{
          ...AGROCONECTA,
          phases: [],
          dimensionsWithoutIntervention: (
            ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const
          ).map(dimensionRefFixture),
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Sin fases pendientes' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('RoadmapPhaseList — lenguaje llano', () => {
  it('no usa flechas ni símbolos de código en las tarjetas', () => {
    const { container } = render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    expect(container.textContent).not.toMatch(/[→⇄⇔↔≤≥]/);
  });

  it('no deja texto de tamaño de nota: nada de text-xs', () => {
    const { container } = render(<RoadmapPhaseList profile={PROFILE} roadmap={AGROCONECTA} />);

    expect(container.innerHTML).not.toContain('text-xs');
    expect(container.innerHTML).not.toContain('text-[10px]');
  });
});

describe('RoadmapExplanationPanel', () => {
  async function opened(roadmap = AGROCONECTA) {
    render(<RoadmapExplanationPanel roadmap={roadmap} />);
    await userEvent.click(screen.getByRole('button', { name: /Cómo se armó este plan/ }));
    return document.getElementById('roadmap-explanation')!;
  }

  it('explica la lógica en cuatro pasos con títulos claros', async () => {
    await opened();

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      '1. Qué dimensiones entran',
      '2. A qué nivel debe llegar cada una',
      '3. Qué va primero',
      '4. Qué servicio propone cada fase',
      'Qué quedó fuera',
    ]);
  });

  it('cuenta qué espera a qué con frases, una vez cada una', async () => {
    const panel = await opened();

    expect(panel.textContent).toContain(
      'Financiación avanza cuando Propiedad Intelectual llega a su meta.',
    );
    expect(
      panel.textContent?.split('Financiación avanza cuando Propiedad Intelectual').length,
    ).toBe(2);
    expect(panel.textContent).not.toMatch(/[→⇄⇔↔]/);
  });

  it('nombra lo que quedó fuera y por qué', async () => {
    const panel = await opened();

    expect(panel.textContent).toContain('alcanzan el nivel esperado');
    expect(within(panel).getByText('Tecnología')).toBeInTheDocument();
  });

  it('no muestra identificadores ni una tabla de columnas técnicas', async () => {
    const panel = await opened();

    expect(within(panel).queryByRole('table')).not.toBeInTheDocument();
    expect(panel.textContent).not.toMatch(/\b(E-?0?\d|TRL|CRL|BRL|IPRL|TmRL|FRL)\b/);
  });

  it('el texto de lectura no baja de text-sm', async () => {
    const panel = await opened();

    expect(panel.innerHTML).not.toContain('text-xs');
  });
});

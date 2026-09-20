import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DIMENSION_CODES,
  type DimensionCode,
  type DimensionWithStatements,
} from '@innlab/contracts';
import { AGROCONECTA_ANSWERS, AGROCONECTA_INITIATIVE } from '../agroconecta-case';
import QuestionnaireAutofill from '../QuestionnaireAutofill';
import InitiativeAutofill from '../InitiativeAutofill';
import {
  isStatementComplete,
  useQuestionnaireDraftStore,
} from '@/features/questionnaire/store/questionnaire-draft.store';

/**
 * The AgroConecta case is the acceptance case of the whole project: the 48
 * answers below are the ones in the specification, in the order of the
 * framework, and they must give TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2.
 */
const EXPECTED_SCORES: Record<DimensionCode, readonly number[]> = {
  TRL: [4, 4, 3, 4, 3, 3, 3, 2],
  CRL: [3, 3, 2, 3, 2, 2, 2, 2],
  BRL: [3, 2, 2, 2, 2, 2, 1, 1],
  IPRL: [2, 1, 1, 1, 1, 1, 1, 1],
  TmRL: [4, 3, 3, 3, 3, 2, 2, 2],
  FRL: [2, 2, 2, 2, 2, 1, 1, 1],
};
const EXPECTED_SUMS: Record<DimensionCode, number> = {
  TRL: 26,
  CRL: 19,
  BRL: 15,
  IPRL: 9,
  TmRL: 22,
  FRL: 13,
};
const EXPECTED_LEVELS: Record<DimensionCode, number> = {
  TRL: 6,
  CRL: 4,
  BRL: 3,
  IPRL: 1,
  TmRL: 5,
  FRL: 2,
};

/** SA-06 conversion table. */
function irlLevel(average: number): number {
  const table: [number, number][] = [
    [1.4, 1],
    [1.8, 2],
    [2.2, 3],
    [2.6, 4],
    [3.0, 5],
    [3.4, 6],
    [3.8, 7],
    [4.4, 8],
  ];
  for (const [upper, level] of table) if (average < upper) return level;
  return 9;
}

function catalog(): DimensionWithStatements[] {
  return DIMENSION_CODES.map((code, d) => ({
    code,
    name: `${code} — Nombre`,
    description: `Descripción de ${code}`,
    sequence: d + 1,
    statements: Array.from({ length: 8 }, (_, i) => ({
      id: String(d * 8 + i + 1),
      dimensionCode: code,
      sequence: i + 1,
      text: `Afirmación ${i + 1}`,
    })),
  }));
}

const byDimension = (code: DimensionCode) =>
  AGROCONECTA_ANSWERS.filter((a) => a.dimension === code);

describe('AgroConecta case — the 48 answers', () => {
  it('has 48 answers: eight per dimension, in the order of the framework', () => {
    expect(AGROCONECTA_ANSWERS).toHaveLength(48);
    expect(AGROCONECTA_ANSWERS.map((a) => a.dimension)).toEqual(
      DIMENSION_CODES.flatMap((c) => Array<DimensionCode>(8).fill(c)),
    );
    for (const code of DIMENSION_CODES) {
      expect(byDimension(code).map((a) => a.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
  });

  it.each(DIMENSION_CODES)('%s uses exactly the scores of the specification', (code) => {
    expect(byDimension(code).map((a) => a.score)).toEqual(EXPECTED_SCORES[code]);
  });

  it.each(DIMENSION_CODES)('%s adds up to the specified sum', (code) => {
    expect(byDimension(code).reduce((sum, a) => sum + a.score, 0)).toBe(EXPECTED_SUMS[code]);
  });

  it('gives exactly TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2 with the SA-06 table', () => {
    const levels = Object.fromEntries(
      DIMENSION_CODES.map((c) => [c, irlLevel(EXPECTED_SUMS[c] / 8)]),
    );
    expect(levels).toEqual(EXPECTED_LEVELS);
    const fromFixture = Object.fromEntries(
      DIMENSION_CODES.map((c) => [
        c,
        irlLevel(byDimension(c).reduce((s, a) => s + a.score, 0) / 8),
      ]),
    );
    expect(fromFixture).toEqual(EXPECTED_LEVELS);
  });

  it('every score is a valid Likert value and every justification is valid for the backend', () => {
    for (const a of AGROCONECTA_ANSWERS) {
      expect([1, 2, 3, 4, 5]).toContain(a.score);
      expect(a.justification.trim().length).toBeGreaterThan(0);
      expect(a.justification.length).toBeLessThanOrEqual(1000);
    }
  });

  it('quotes a few justifications verbatim', () => {
    expect(byDimension('TRL')[0].justification).toBe(
      'La arquitectura general de la plataforma (mercado digital, portal de compradores, seguimiento logístico) está documentada en Notion con diagramas de flujo del proceso.',
    );
    expect(byDimension('IPRL')[7].justification).toContain('riesgo legal activo');
    expect(byDimension('FRL')[7].justification).toBe(
      'El margen de operación actual es de apenas 3 meses; no existen ingresos recurrentes ni financiamiento adicional asegurado más allá del incentivo regional recibido.',
    );
  });
});

describe('AgroConecta case — the initiative profile', () => {
  it('has the seven fields of the specification, verbatim', () => {
    expect(AGROCONECTA_INITIATIVE.name).toBe(
      'AgroConecta — Plataforma digital de trazabilidad y comercialización directa de café',
    );
    expect(AGROCONECTA_INITIATIVE.sectorName).toBe('Agroindustria / AgriTech');
    expect(AGROCONECTA_INITIATIVE.productType).toBe(
      'Aplicación web (mercado digital) + módulo de trazabilidad de calidad para la cadena de café',
    );
    expect(AGROCONECTA_INITIATIVE.declaredStage).toBe(
      'Piloto completado — buscando validar el modelo comercial y resolver riesgos legales antes de escalar',
    );
    expect(AGROCONECTA_INITIATIVE.teamDescription).toBe(
      '3 personas — 1 fundadora agrónoma (tiempo completo), 1 coordinadora de operaciones (medio tiempo), 1 desarrollador externo contratado por proyecto',
    );
    expect(AGROCONECTA_INITIATIVE.targetMarket).toBe(
      'Productores de café de pequeña escala y compradores exportadores en el suroccidente colombiano (Cauca y Valle del Cauca)',
    );
    expect(AGROCONECTA_INITIATIVE.currentFunding).toBe(
      'Ahorros de la fundadora + un incentivo regional de innovación de COP 25M',
    );
    expect(AGROCONECTA_INITIATIVE.teamSize).toBe(3);
  });

  it('maps the declared stage to the catalog stage «Validación»', () => {
    expect(AGROCONECTA_INITIATIVE.stageCode).toBe('validacion');
  });
});

describe('QuestionnaireAutofill button', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
  });

  it('fills the 48 answers and their justifications, matched by dimension and sequence', async () => {
    const user = userEvent.setup();
    const dimensions = catalog();
    render(<QuestionnaireAutofill dimensions={dimensions} />);

    await user.click(screen.getByRole('button', { name: /Autocompletar con AgroConecta/ }));

    const { answers, justifications } = useQuestionnaireDraftStore.getState();
    expect(Object.keys(answers)).toHaveLength(48);
    for (const item of AGROCONECTA_ANSWERS) {
      const statement = dimensions
        .find((d) => d.code === item.dimension)!
        .statements.find((s) => s.sequence === item.sequence)!;
      expect(answers[statement.id]).toBe(item.score);
      expect(justifications[statement.id]).toBe(item.justification);
    }
  });

  it('leaves every statement complete, so the questionnaire can be processed', async () => {
    const user = userEvent.setup();
    const dimensions = catalog();
    render(<QuestionnaireAutofill dimensions={dimensions} />);

    await user.click(screen.getByRole('button'));

    const { answers, justifications } = useQuestionnaireDraftStore.getState();
    const statements = dimensions.flatMap((d) => d.statements);
    expect(statements.every((s) => isStatementComplete(answers, justifications, s.id))).toBe(true);
  });

  it('says it is for development only', () => {
    render(<QuestionnaireAutofill dimensions={catalog()} />);

    expect(screen.getByRole('button')).toHaveTextContent('solo desarrollo');
  });
});

describe('InitiativeAutofill button', () => {
  it('fills the form values, looking up the sector by name and the stage by code', async () => {
    const user = userEvent.setup();
    const values: unknown[] = [];
    render(
      <InitiativeAutofill
        sectors={[
          { id: '7', name: 'Salud' },
          { id: '9', name: 'Agroindustria / AgriTech' },
        ]}
        stages={[
          { id: '1', code: 'idea' },
          { id: '5', code: 'validacion' },
        ]}
        onFill={(v) => values.push(v)}
      />,
    );

    await user.click(screen.getByRole('button'));

    expect(values).toEqual([
      {
        name: AGROCONECTA_INITIATIVE.name,
        sectorId: '9',
        productType: AGROCONECTA_INITIATIVE.productType,
        stageId: '5',
        declaredStage: AGROCONECTA_INITIATIVE.declaredStage,
        teamSize: '3',
        teamDescription: AGROCONECTA_INITIATIVE.teamDescription,
        targetMarket: AGROCONECTA_INITIATIVE.targetMarket,
        currentFunding: AGROCONECTA_INITIATIVE.currentFunding,
      },
    ]);
  });
});

describe('the switch is a build-time variable (Oleada 8)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is off by default: no autofill components, no runtime way to turn it on', async () => {
    const mod = await import('../dev-autofill');

    expect(mod.DEV_AUTOFILL_ENABLED).toBe(false);
    expect(mod.QuestionnaireAutofill).toBeNull();
    expect(mod.InitiativeAutofill).toBeNull();
  });

  it('is on only when VITE_DEV_AUTOFILL is exactly "true" at build time', async () => {
    vi.stubEnv('VITE_DEV_AUTOFILL', 'true');
    vi.resetModules();

    const mod = await import('../dev-autofill');

    expect(mod.DEV_AUTOFILL_ENABLED).toBe(true);
    expect(mod.QuestionnaireAutofill).not.toBeNull();
    expect(mod.InitiativeAutofill).not.toBeNull();
  });

  it.each(['false', '1', 'TRUE', ''])('stays off for %j', async (value) => {
    vi.stubEnv('VITE_DEV_AUTOFILL', value);
    vi.resetModules();

    const mod = await import('../dev-autofill');

    expect(mod.DEV_AUTOFILL_ENABLED).toBe(false);
    expect(mod.QuestionnaireAutofill).toBeNull();
  });

  it('renders the button on the questionnaire page only in a development build', async () => {
    vi.stubEnv('VITE_DEV_AUTOFILL', 'true');
    vi.resetModules();
    const { QuestionnaireAutofill: Lazy } = await import('../dev-autofill');
    const { Suspense } = await import('react');

    await act(async () => {
      render(<Suspense fallback={null}>{Lazy && <Lazy dimensions={catalog()} />}</Suspense>);
    });

    expect(await screen.findByTestId('dev-autofill-questionnaire')).toBeInTheDocument();
  });
});

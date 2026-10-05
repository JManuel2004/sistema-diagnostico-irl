import { buildJustification } from '../../../../../../src/modules/routing/application/use-cases/generate-recommendation.use-case.js';

const NAMES = new Map([
  ['TRL', 'Tecnología'],
  ['BRL', 'Negocio'],
  ['IPRL', 'Propiedad intelectual'],
]);

function winner(details: { dimension: string; sourceLabel: string }[]) {
  return {
    serviceName: 'Reto Express',
    contributions: { bottleneck: { details } },
  };
}

// The initiative leader reads this text: it must not carry framework codes or
// the internal ordinal labels.
describe('construirJustificacion', () => {
  it('names the lagging dimension by its catalog name, not by its code or its ordinal label', () => {
    const text = buildJustification(
      [winner([{ dimension: 'BRL', sourceLabel: 'primary' }])],
      [],
      NAMES,
    );

    expect(text).toBe(
      'Reto Express atiende de forma directa la dimensión más rezagada de tu iniciativa: Negocio.',
    );
    expect(text).not.toMatch(/BRL|primary|secondary/);
  });

  it('lists several tied dimensions with a comma and a final «y»', () => {
    const text = buildJustification(
      [
        winner([
          { dimension: 'TRL', sourceLabel: 'primary' },
          { dimension: 'BRL', sourceLabel: 'secondary' },
          { dimension: 'IPRL', sourceLabel: 'primary' },
        ]),
      ],
      [],
      NAMES,
    );

    expect(text).toContain('Tecnología, Negocio y Propiedad intelectual.');
  });

  it('skips the dimensions the service does not address', () => {
    const text = buildJustification(
      [
        winner([
          { dimension: 'TRL', sourceLabel: 'not_applicable' },
          { dimension: 'BRL', sourceLabel: 'primary' },
        ]),
      ],
      [],
      NAMES,
    );

    expect(text).not.toContain('Tecnología');
    expect(text).toContain('Negocio');
  });

  it('falls back to the global affinity sentence when no dimension applies', () => {
    const text = buildJustification(
      [winner([{ dimension: 'TRL', sourceLabel: 'not_applicable' }])],
      [],
      NAMES,
    );

    expect(text).toBe(
      'Reto Express es el servicio con mayor afinidad global con el perfil de la iniciativa.',
    );
  });

  it('cites the declared reason when an exception decided the first place', () => {
    const text = buildJustification(
      [winner([{ dimension: 'BRL', sourceLabel: 'primary' }])],
      [
        {
          targetService: 'Reto Express',
          declaredReason: 'Abre el diálogo antes que lo masivo.',
        },
      ],
      NAMES,
    );

    expect(text).toBe('Reto Express — Abre el diálogo antes que lo masivo.');
  });

  it('returns null when there is no ranking', () => {
    expect(buildJustification([], [], NAMES)).toBeNull();
  });

  it('if an adjustment put the winner into the ranking, it quotes the adjustment', () => {
    const text = buildJustification(
      [
        {
          serviceName: 'Academia a la Medida',
          includedBy: { declaredReason: 'Formar al propio equipo.' },
        },
      ],
      [],
      NAMES,
    );

    expect(text).toBe('Academia a la Medida — Formar al propio equipo.');
  });
});

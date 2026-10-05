import { describe, expect, it } from '@jest/globals';
import {
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  ORDINAL_PROFILES,
  SERVICES,
  SERVICE_TIERS,
  STAGES,
  type EligibilityRuleSeed,
  type ExceptionRuleSeed,
  type OrdinalProfileSeed,
  type ServiceSeed,
} from '../../../../../../src/shared/kernel/infrastructure/database/seeds/data/routing.js';
import { assertRoutingSeedIsConsistent } from '../../../../../../src/shared/kernel/infrastructure/database/seeds/seed-routing.js';

/**
 * The routing seed is checked before anything is written. These tests keep
 * the real seed valid and prove each check rejects what it has to: a
 * misconfiguration fails on the data, not halfway through the transaction.
 */
const SEED = {
  tiers: SERVICE_TIERS,
  services: SERVICES,
  profiles: ORDINAL_PROFILES,
  eligibilityRules: ELIGIBILITY_RULES,
  exceptionRules: EXCEPTION_RULES,
  stageCodes: STAGES.map((s) => s.code),
};

function withServices(services: readonly ServiceSeed[]) {
  return { ...SEED, services };
}
function withProfiles(profiles: readonly OrdinalProfileSeed[]) {
  return { ...SEED, profiles };
}
function withEligibility(eligibilityRules: readonly EligibilityRuleSeed[]) {
  return { ...SEED, eligibilityRules };
}
function withExceptions(exceptionRules: readonly ExceptionRuleSeed[]) {
  return { ...SEED, exceptionRules };
}
const profileOf = (name: string) =>
  ORDINAL_PROFILES.find((p) => p.service === name)!;

describe('Seed de enrutamiento — portafolio oficial', () => {
  it('el seed vigente es coherente', () => {
    expect(() => assertRoutingSeedIsConsistent(SEED)).not.toThrow();
  });

  it('trae los 12 servicios del portafolio, 4 de ellos solo por ajuste', () => {
    expect(SERVICES).toHaveLength(12);
    expect(SERVICES.filter((s) => s.adjustmentOnly).map((s) => s.name)).toEqual(
      [
        'Chispa',
        'Academia a la Medida',
        'Práctica de Innovación',
        'Alianza Residente',
      ],
    );
    expect(SERVICES.map((s) => s.name)).not.toContain('Mentoría');
  });

  it('cada servicio trae nombre, subtítulo, descripción, alcance y nivel, separados', () => {
    const reto = SERVICES.find((s) => s.name === 'Reto Express')!;
    expect(reto.subtitle).toBe('Hackatón · Design Sprint · Challenge');
    expect(reto.scope).toContain('prototipos tempranos (TRL 3–5)');
    expect(reto.tier).toBe('descubre');
    // The name never carries the subtitle glued to it.
    for (const s of SERVICES) expect(s.name).not.toContain(s.subtitle);
  });

  it('los cuatro niveles del portafolio van de lo más liviano a lo más profundo', () => {
    expect(SERVICE_TIERS.map((t) => [t.order, t.name])).toEqual([
      [1, 'Descubre'],
      [2, 'Co-crea'],
      [3, 'Profundiza'],
      [4, 'Alíate'],
    ]);
    const tierOf = (name: string) =>
      SERVICES.find((s) => s.name === name)!.tier;
    expect(tierOf('Chispa')).toBe('descubre');
    expect(tierOf('Reto en el Aula')).toBe('co-crea');
    expect(tierOf('Talento In-House')).toBe('profundiza');
    expect(tierOf('Alianza Residente')).toBe('aliate');
  });

  it('rechaza un servicio con un nivel que no existe', () => {
    const services = SERVICES.map((s) =>
      s.name === 'Chispa' ? { ...s, tier: 'inexistente' } : s,
    );
    expect(() => assertRoutingSeedIsConsistent(withServices(services))).toThrow(
      /unknown tier 'inexistente'/,
    );
  });

  it('rechaza un servicio sin subtítulo o sin alcance', () => {
    const services = SERVICES.map((s) =>
      s.name === 'Chispa' ? { ...s, subtitle: ' ', scope: '' } : s,
    );
    expect(() => assertRoutingSeedIsConsistent(withServices(services))).toThrow(
      /'Chispa' needs a subtitle[\s\S]*'Chispa' needs a scope/,
    );
  });

  it('rechaza niveles cuyo orden no es consecutivo desde 1', () => {
    const tiers = SERVICE_TIERS.map((t) =>
      t.order === 4 ? { ...t, order: 5 } : t,
    );
    expect(() => assertRoutingSeedIsConsistent({ ...SEED, tiers })).toThrow(
      /consecutive from 1/,
    );
  });

  it('cada servicio tiene una ficha con sus seis intensidades', () => {
    for (const service of SERVICES) {
      expect(Object.keys(profileOf(service.name).intensities)).toHaveLength(6);
    }
  });

  it('Alianza Residente conserva su banda 1–9 aunque sea solo por ajuste', () => {
    expect(profileOf('Alianza Residente')).toMatchObject({
      minLevel: 1,
      maxLevel: 9,
    });
    expect(profileOf('Chispa')).toMatchObject({
      minLevel: null,
      maxLevel: null,
    });
  });

  it('rechaza un servicio puntuable sin banda', () => {
    const profiles = ORDINAL_PROFILES.map((p) =>
      p.service === 'Reto Express'
        ? { ...p, minLevel: null, maxLevel: null }
        : p,
    );

    expect(() => assertRoutingSeedIsConsistent(withProfiles(profiles))).toThrow(
      "'Reto Express' is scored and needs a level band",
    );
  });

  it('rechaza una banda fuera de 1–9 o invertida', () => {
    const profiles = ORDINAL_PROFILES.map((p) =>
      p.service === 'Reto Express' ? { ...p, minLevel: 6, maxLevel: 4 } : p,
    );

    expect(() => assertRoutingSeedIsConsistent(withProfiles(profiles))).toThrow(
      'within 1–9',
    );
  });

  it('rechaza una ficha sin las seis intensidades o con una etapa desconocida', () => {
    const profiles = ORDINAL_PROFILES.map((p) =>
      p.service === 'Chispa'
        ? {
            ...p,
            intensities: { TRL: 'primary' as const },
            relevantStages: ['madurez'],
          }
        : p,
    );

    expect(() => assertRoutingSeedIsConsistent(withProfiles(profiles))).toThrow(
      /one intensity per dimension[\s\S]*unknown stage 'madurez'/,
    );
  });

  it('rechaza una exclusión sobre un servicio solo por ajuste', () => {
    const rules = [
      ...ELIGIBILITY_RULES,
      {
        code: 'ELG-99',
        service: 'Chispa',
        predicate: {},
        exclusionMessage: 'x',
      },
    ];

    expect(() => assertRoutingSeedIsConsistent(withEligibility(rules))).toThrow(
      "ELG-99 excludes 'Chispa', which is adjustment-only",
    );
  });

  it('rechaza INCLUDE sobre un servicio puntuable', () => {
    const rules = [
      ...EXCEPTION_RULES,
      {
        ...EXCEPTION_RULES[2],
        code: 'INC-99',
        priorityOrder: 99,
        targetService: 'Reto Express',
      },
    ];

    expect(() => assertRoutingSeedIsConsistent(withExceptions(rules))).toThrow(
      'INC-99: INCLUDE only applies to adjustment-only services',
    );
  });

  const rankingRule = (
    action: 'FORCE' | 'VETO' | 'PROMOTE' | 'DEMOTE',
    priorityOrder: number,
  ) => ({
    ...EXCEPTION_RULES[0],
    code: 'E-99',
    priorityOrder,
    action,
    positions: action === 'PROMOTE' || action === 'DEMOTE' ? 1 : null,
    targetService: 'Alianza Residente',
  });

  it.each(['FORCE', 'VETO', 'PROMOTE', 'DEMOTE'] as const)(
    'rechaza %s sobre un servicio solo por ajuste que ninguna regla anterior incluye',
    (action) => {
      // INC-04 includes Alianza Residente with priority 6: a rule before it
      // would find it outside the ranking and could never apply.
      const rules = [...EXCEPTION_RULES, rankingRule(action, 0)];

      expect(() =>
        assertRoutingSeedIsConsistent(withExceptions(rules)),
      ).toThrow(
        `E-99: ${action} targets 'Alianza Residente', which is adjustment-only and no earlier INCLUDE puts into the ranking`,
      );
    },
  );

  it.each(['FORCE', 'VETO', 'PROMOTE', 'DEMOTE'] as const)(
    'admite %s sobre un servicio solo por ajuste después de la regla que lo incluye',
    (action) => {
      const rules = [...EXCEPTION_RULES, rankingRule(action, 99)];

      expect(() =>
        assertRoutingSeedIsConsistent(withExceptions(rules)),
      ).not.toThrow();
    },
  );

  it('exige el puesto de destino en INCLUDE y el desplazamiento en PROMOTE, y lo rechaza en FORCE', () => {
    const rules = EXCEPTION_RULES.map((r) =>
      r.code === 'INC-01' || r.code === 'E-02' ? { ...r, positions: null } : r,
    );
    const forced = [
      ...EXCEPTION_RULES,
      { ...rankingRule('FORCE', 99), positions: 1 },
    ];

    expect(() => assertRoutingSeedIsConsistent(withExceptions(rules))).toThrow(
      /E-02: positions are required[\s\S]*INC-01: positions are required/,
    );
    expect(() => assertRoutingSeedIsConsistent(withExceptions(forced))).toThrow(
      'E-99: positions are required, and only allowed, for PROMOTE, DEMOTE and INCLUDE',
    );
  });

  it('rechaza códigos o prioridades repetidos y servicios desconocidos', () => {
    const rules = [
      ...EXCEPTION_RULES,
      { ...EXCEPTION_RULES[0], targetService: 'Mentoría' },
    ];

    expect(() => assertRoutingSeedIsConsistent(withExceptions(rules))).toThrow(
      /targets the unknown service 'Mentoría'[\s\S]*share a code[\s\S]*share a priority/,
    );
  });

  it('rechaza un servicio sin ficha', () => {
    const services = [
      ...SERVICES,
      {
        name: 'Mentoría',
        subtitle: 'x',
        description: 'x',
        scope: 'x',
        tier: 'descubre',
        adjustmentOnly: false,
      },
    ];

    expect(() => assertRoutingSeedIsConsistent(withServices(services))).toThrow(
      "'Mentoría' must have exactly one ordinal profile",
    );
  });
});

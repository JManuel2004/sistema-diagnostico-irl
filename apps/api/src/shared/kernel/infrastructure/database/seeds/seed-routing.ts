import type { EntityManager } from 'typeorm';
import {
  CALIBRATION_SCALE,
  STAGES,
  ORDINAL_PROFILES,
  SCORING_PARAMETERS,
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  SERVICES,
  SERVICE_TIERS,
  type EligibilityRuleSeed,
  type ExceptionRuleSeed,
  type OrdinalProfileSeed,
  type ServiceSeed,
  type ServiceTierSeed,
} from './data/routing.js';

/**
 * Seeds the routing catalog: the services with their ordinal profiles, the
 * calibration scale, the scoring parameters and the rules.
 *
 * Every table is written by its natural key (service name, stage code,
 * label, `(service, dimension)`, the fixed `id = 1` of the parameters), so
 * running the seed again **applies** a change of the configuration instead
 * of skipping it. What left the seed leaves the catalog: services no longer
 * listed are deleted, and the rules are rewritten whole. The configuration
 * is not versioned: the stored one is always the seed's.
 *
 * It runs inside the runner's transaction, so the configuration ends up
 * complete or not at all.
 */
export async function seedRouting(
  manager: EntityManager,
): Promise<{ services: number }> {
  assertRoutingSeedIsConsistent({
    tiers: SERVICE_TIERS,
    services: SERVICES,
    profiles: ORDINAL_PROFILES,
    eligibilityRules: ELIGIBILITY_RULES,
    exceptionRules: EXCEPTION_RULES,
    stageCodes: STAGES.map((st) => st.code),
  });

  for (const e of STAGES) {
    await manager.query(
      `INSERT INTO irl_catalog.initiative_stage (code, name, sequence, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, sequence = EXCLUDED.sequence`,
      [e.code, e.name, e.order],
    );
  }

  for (const t of SERVICE_TIERS) {
    await manager.query(
      `INSERT INTO irl_catalog.service_tier (code, name, sequence, tagline, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, sequence = EXCLUDED.sequence,
             tagline = EXCLUDED.tagline, description = EXCLUDED.description`,
      [t.code, t.name, t.order, t.tagline, t.description],
    );
  }

  for (const p of CALIBRATION_SCALE) {
    await manager.query(
      `INSERT INTO irl_catalog.calibration_label_value (label, numeric_value, monotonicity_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (label) DO UPDATE
         SET numeric_value = EXCLUDED.numeric_value,
             monotonicity_order = EXCLUDED.monotonicity_order`,
      [p.label, p.value, p.order],
    );
  }

  const P = SCORING_PARAMETERS;
  await manager.query(
    `INSERT INTO irl_catalog.scoring_parameters
       (id, bottleneck_weight, gap_weight, moderate_imbalance_weight,
        critical_imbalance_weight, stage_affinity_weight,
        out_of_range_penalty, minimum_threshold, alternatives_count,
        phase_coverage_weight, phase_minimum_threshold)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE
       SET bottleneck_weight = EXCLUDED.bottleneck_weight,
           gap_weight = EXCLUDED.gap_weight,
           moderate_imbalance_weight = EXCLUDED.moderate_imbalance_weight,
           critical_imbalance_weight = EXCLUDED.critical_imbalance_weight,
           stage_affinity_weight = EXCLUDED.stage_affinity_weight,
           out_of_range_penalty = EXCLUDED.out_of_range_penalty,
           minimum_threshold = EXCLUDED.minimum_threshold,
           alternatives_count = EXCLUDED.alternatives_count,
           phase_coverage_weight = EXCLUDED.phase_coverage_weight,
           phase_minimum_threshold = EXCLUDED.phase_minimum_threshold`,
    [
      P.bottleneckWeight,
      P.gapWeight,
      P.moderateImbalanceWeight,
      P.criticalImbalanceWeight,
      P.stageAffinityWeight,
      P.outOfRangePenalty,
      P.minimumThreshold,
      P.alternativesCount,
      P.phaseCoverageWeight,
      P.phaseMinimumThreshold,
    ],
  );

  // ── Services and their ordinal profiles ─────────────────────────────
  // The rules go first: they point at services, and a service that leaves
  // the seed, or changes kind, must not be held back by a rule of the old
  // configuration. The seed is the whole rule set, so it is rewritten.
  await manager.query(`DELETE FROM irl_catalog.exception_rule`);
  await manager.query(`DELETE FROM irl_catalog.eligibility_rule`);
  await removeServicesNotInSeed(manager);

  const profileByService = new Map(
    ORDINAL_PROFILES.map((p) => [p.service, p] as const),
  );
  for (const s of SERVICES) {
    const profile = profileByService.get(s.name);
    if (!profile) {
      throw new Error(`Service '${s.name}' has no ordinal profile in the seed`);
    }
    const [{ id: idService }] = await manager.query<{ id: number }[]>(
      `INSERT INTO irl_catalog.portfolio_service
         (name, subtitle, description, scope, id_tier, is_active, adjustment_only,
          min_level, max_level)
       SELECT $1, $2, $3, $4, t.id, true, $6, $7, $8
         FROM irl_catalog.service_tier t
        WHERE t.code = $5
       ON CONFLICT (name) DO UPDATE
         SET subtitle = EXCLUDED.subtitle,
             description = EXCLUDED.description,
             scope = EXCLUDED.scope,
             id_tier = EXCLUDED.id_tier,
             adjustment_only = EXCLUDED.adjustment_only,
             min_level = EXCLUDED.min_level,
             max_level = EXCLUDED.max_level
       RETURNING id`,
      [
        s.name,
        s.subtitle,
        s.description,
        s.scope,
        s.tier,
        s.adjustmentOnly,
        profile.minLevel,
        profile.maxLevel,
      ],
    );
    // The stages of the profile are replaced whole: the seed is the list.
    await manager.query(
      `DELETE FROM irl_catalog.portfolio_service_stage WHERE id_service = $1`,
      [idService],
    );
    for (const stageCode of profile.relevantStages) {
      const inserted = await manager.query<unknown[]>(
        `INSERT INTO irl_catalog.portfolio_service_stage (id_service, id_stage)
         SELECT $1, st.id FROM irl_catalog.initiative_stage st WHERE st.code = $2
         RETURNING id_service`,
        [idService, stageCode],
      );
      if (inserted.length === 0) {
        throw new Error(
          `Service '${s.name}' names the unknown stage '${stageCode}'`,
        );
      }
    }

    const dimensions = Object.entries(profile.intensities);
    if (dimensions.length !== 6) {
      throw new Error(
        `Service '${s.name}' must have one intensity per dimension (6)`,
      );
    }
    for (const [dimension, label] of dimensions) {
      const inserted = await manager.query<unknown[]>(
        `INSERT INTO irl_catalog.ordinal_intensity (id_service, id_dimension, id_calibration_label)
         SELECT $1, d.id_dimension, c.id
           FROM irl_catalog.dimension d, irl_catalog.calibration_label_value c
          WHERE d.code = $2 AND c.label = $3
         ON CONFLICT (id_service, id_dimension) DO UPDATE
           SET id_calibration_label = EXCLUDED.id_calibration_label
         RETURNING id`,
        [idService, dimension, label],
      );
      if (inserted.length === 0) {
        throw new Error(
          `Service '${s.name}': unknown dimension '${dimension}' or label '${label}'`,
        );
      }
    }
  }

  // ── Rules ───────────────────────────────────────────────────────────
  for (const rule of ELIGIBILITY_RULES) {
    await manager.query(
      `INSERT INTO irl_catalog.eligibility_rule (code, id_service, predicate, exclusion_message)
       SELECT $1, s.id, $3::jsonb, $4
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $2`,
      [
        rule.code,
        rule.service,
        JSON.stringify(rule.predicate),
        rule.exclusionMessage,
      ],
    );
  }

  for (const rule of EXCEPTION_RULES) {
    await manager.query(
      `INSERT INTO irl_catalog.exception_rule
         (code, predicate, action, id_target_service, target_adjustment_only, positions,
          declared_reason, priority_order)
       SELECT $1, $2::jsonb, $3, s.id, s.adjustment_only, $5, $6, $7
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $4`,
      [
        rule.code,
        JSON.stringify(rule.predicate),
        rule.action,
        rule.targetService,
        rule.positions,
        rule.declaredReason,
        rule.priorityOrder,
      ],
    );
  }

  return { services: SERVICES.length };
}

/**
 * Deletes the services that are no longer in the seed, with their stages
 * and intensities (by cascade). The engine loads every service of the
 * catalog, so leaving one behind would keep recommending it.
 *
 * A service a saved recommendation points to is not deleted: the
 * recommendation keeps its reference to the service it recommended. The
 * seed then stops, and the stored recommendations have to be dealt with
 * first — today, by rebuilding the development database.
 */
async function removeServicesNotInSeed(manager: EntityManager): Promise<void> {
  const names = SERVICES.map((s) => s.name);
  const referenced = await manager.query<{ name: string }[]>(
    `SELECT DISTINCT s.name
       FROM irl_catalog.portfolio_service s
      WHERE s.name <> ALL($1)
        AND EXISTS (SELECT 1 FROM irl_diagnostic.recommendation_rank r WHERE r.id_service = s.id)
      ORDER BY s.name`,
    [names],
  );
  if (referenced.length > 0) {
    throw new Error(
      `The services ${referenced.map((r) => `'${r.name}'`).join(', ')} left the seed but saved ` +
        'recommendations point to them. Rebuild the database, or remove those recommendations, ' +
        'before seeding the new portfolio.',
    );
  }
  await manager.query(
    `DELETE FROM irl_catalog.portfolio_service WHERE name <> ALL($1)`,
    [names],
  );
}

/**
 * Checks the routing seed before anything is written, so a broken
 * configuration fails with a message about the data instead of a
 * constraint violation halfway through the transaction. The database
 * enforces the same rules on its own.
 */
export function assertRoutingSeedIsConsistent(data: {
  readonly tiers: readonly ServiceTierSeed[];
  readonly services: readonly ServiceSeed[];
  readonly profiles: readonly OrdinalProfileSeed[];
  readonly eligibilityRules: readonly EligibilityRuleSeed[];
  readonly exceptionRules: readonly ExceptionRuleSeed[];
  readonly stageCodes: readonly string[];
}): void {
  const errors: string[] = [];
  const service = new Map(data.services.map((s) => [s.name, s] as const));

  if (service.size !== data.services.length)
    errors.push('two services share a name');

  const tierCodes = new Set(data.tiers.map((t) => t.code));
  if (tierCodes.size !== data.tiers.length)
    errors.push('two tiers share a code');
  if (new Set(data.tiers.map((t) => t.name)).size !== data.tiers.length)
    errors.push('two tiers share a name');
  const orders = data.tiers.map((t) => t.order).sort((a, b) => a - b);
  if (orders.some((o, i) => o !== i + 1))
    errors.push(
      'the tier orders must be consecutive from 1 (1 is the lightest)',
    );

  for (const s of data.services) {
    if (!tierCodes.has(s.tier))
      errors.push(`'${s.name}' names the unknown tier '${s.tier}'`);
    for (const [field, text, max] of [
      ['subtitle', s.subtitle, 120],
      ['scope', s.scope, 500],
      ['description', s.description, 500],
    ] as const) {
      if (text.trim().length === 0) errors.push(`'${s.name}' needs a ${field}`);
      else if (text.length > max)
        errors.push(
          `'${s.name}': the ${field} exceeds ${String(max)} characters`,
        );
    }
  }

  for (const s of data.services) {
    const profiles = data.profiles.filter((p) => p.service === s.name);
    if (profiles.length !== 1) {
      errors.push(
        `'${s.name}' must have exactly one ordinal profile (has ${String(profiles.length)})`,
      );
      continue;
    }
    const [p] = profiles;
    const banded = p.minLevel !== null && p.maxLevel !== null;
    if ((p.minLevel === null) !== (p.maxLevel === null)) {
      errors.push(`'${s.name}': the band needs both ends or neither`);
    } else if (banded && !validBand(p.minLevel, p.maxLevel)) {
      errors.push(`'${s.name}': the band must be within 1–9 with min ≤ max`);
    } else if (!s.adjustmentOnly && !banded) {
      errors.push(`'${s.name}' is scored and needs a level band`);
    }
    if (Object.keys(p.intensities).length !== 6) {
      errors.push(`'${s.name}' must have one intensity per dimension (6)`);
    }
    for (const stage of p.relevantStages) {
      if (!data.stageCodes.includes(stage))
        errors.push(`'${s.name}' names the unknown stage '${stage}'`);
    }
  }
  for (const p of data.profiles) {
    if (!service.has(p.service))
      errors.push(`profile of the unknown service '${p.service}'`);
  }

  for (const r of data.eligibilityRules) {
    const target = service.get(r.service);
    if (!target)
      errors.push(`${r.code} excludes the unknown service '${r.service}'`);
    else if (target.adjustmentOnly) {
      errors.push(
        `${r.code} excludes '${r.service}', which is adjustment-only and takes no part in layer 1`,
      );
    }
  }
  if (
    new Set(data.eligibilityRules.map((r) => r.code)).size !==
    data.eligibilityRules.length
  ) {
    errors.push('two eligibility rules share a code');
  }

  for (const r of data.exceptionRules) {
    const target = service.get(r.targetService);
    if (!target) {
      errors.push(`${r.code} targets the unknown service '${r.targetService}'`);
    } else if (r.action === 'INCLUDE' && !target.adjustmentOnly) {
      errors.push(
        `${r.code}: INCLUDE only applies to adjustment-only services, not '${r.targetService}'`,
      );
    } else if (r.action !== 'INCLUDE' && target.adjustmentOnly) {
      // An adjustment-only service is only in the ranking if an earlier rule
      // included it; without one, this rule could never apply.
      const includedBefore = data.exceptionRules.some(
        (other) =>
          other.action === 'INCLUDE' &&
          other.targetService === r.targetService &&
          other.priorityOrder < r.priorityOrder,
      );
      if (!includedBefore) {
        errors.push(
          `${r.code}: ${r.action} targets '${r.targetService}', which is adjustment-only and no ` +
            'earlier INCLUDE puts into the ranking',
        );
      }
    }
    const takesPositions =
      r.action === 'PROMOTE' || r.action === 'DEMOTE' || r.action === 'INCLUDE';
    if (takesPositions !== (r.positions !== null && r.positions > 0)) {
      errors.push(
        `${r.code}: positions are required, and only allowed, for PROMOTE, DEMOTE and INCLUDE`,
      );
    }
  }
  if (
    new Set(data.exceptionRules.map((r) => r.code)).size !==
    data.exceptionRules.length
  ) {
    errors.push('two exception rules share a code');
  }
  if (
    new Set(data.exceptionRules.map((r) => r.priorityOrder)).size !==
    data.exceptionRules.length
  ) {
    errors.push('two exception rules share a priority');
  }

  if (errors.length > 0) {
    throw new Error(`Inconsistent routing seed:\n  - ${errors.join('\n  - ')}`);
  }
}

function validBand(min: number, max: number): boolean {
  return (
    Number.isInteger(min) &&
    Number.isInteger(max) &&
    min >= 1 &&
    max <= 9 &&
    min <= max
  );
}

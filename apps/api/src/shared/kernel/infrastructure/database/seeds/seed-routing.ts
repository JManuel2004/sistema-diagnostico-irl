import type { EntityManager } from 'typeorm';
import {
  CALIBRATION_SCALE,
  STAGES,
  ORDINAL_PROFILES,
  SCORING_PARAMETERS,
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  SERVICES,
} from './data/routing.js';

/**
 * Seeds the routing catalog: the services with their ordinal profiles, the
 * calibration scale, the scoring parameters and the rules.
 *
 * Every table is written by its natural key (service name, stage code,
 * label, `(service, dimension)`, rule code, the fixed `id = 1` of the
 * parameters), so running the seed again **applies** a change of the
 * configuration instead of skipping it. The configuration is not versioned:
 * the stored one is always the seed's.
 *
 * It runs inside the runner's transaction, so the configuration ends up
 * complete or not at all.
 */
export async function seedRouting(manager: EntityManager): Promise<{ services: number }> {
  for (const e of STAGES) {
    await manager.query(
      `INSERT INTO irl_catalog.initiative_stage (code, name, sequence, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, sequence = EXCLUDED.sequence`,
      [e.code, e.name, e.order],
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
        out_of_range_penalty, minimum_threshold, alternatives_count)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE
       SET bottleneck_weight = EXCLUDED.bottleneck_weight,
           gap_weight = EXCLUDED.gap_weight,
           moderate_imbalance_weight = EXCLUDED.moderate_imbalance_weight,
           critical_imbalance_weight = EXCLUDED.critical_imbalance_weight,
           stage_affinity_weight = EXCLUDED.stage_affinity_weight,
           out_of_range_penalty = EXCLUDED.out_of_range_penalty,
           minimum_threshold = EXCLUDED.minimum_threshold,
           alternatives_count = EXCLUDED.alternatives_count`,
    [
      P.bottleneckWeight,
      P.gapWeight,
      P.moderateImbalanceWeight,
      P.criticalImbalanceWeight,
      P.stageAffinityWeight,
      P.outOfRangePenalty,
      P.minimumThreshold,
      P.alternativesCount,
    ],
  );

  // ── Services and their ordinal profiles ─────────────────────────────
  const profileByService = new Map(ORDINAL_PROFILES.map((p) => [p.service, p] as const));
  for (const s of SERVICES) {
    const profile = profileByService.get(s.name);
    if (!profile) {
      throw new Error(`Service '${s.name}' has no ordinal profile in the seed`);
    }
    const [{ id: idService }] = await manager.query<{ id: number }[]>(
      `INSERT INTO irl_catalog.portfolio_service (name, description, is_active, min_level, max_level)
       VALUES ($1, $2, true, $3, $4)
       ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description,
             min_level = EXCLUDED.min_level,
             max_level = EXCLUDED.max_level
       RETURNING id`,
      [s.name, s.description, profile.minLevel, profile.maxLevel],
    );

    // The stages of the profile are replaced whole: the seed is the list.
    await manager.query(`DELETE FROM irl_catalog.portfolio_service_stage WHERE id_service = $1`, [
      idService,
    ]);
    for (const stageCode of profile.relevantStages) {
      const inserted = await manager.query<unknown[]>(
        `INSERT INTO irl_catalog.portfolio_service_stage (id_service, id_stage)
         SELECT $1, st.id FROM irl_catalog.initiative_stage st WHERE st.code = $2
         RETURNING id_service`,
        [idService, stageCode],
      );
      if (inserted.length === 0) {
        throw new Error(`Service '${s.name}' names the unknown stage '${stageCode}'`);
      }
    }

    const dimensions = Object.entries(profile.intensities);
    if (dimensions.length !== 6) {
      throw new Error(`Service '${s.name}' must have one intensity per dimension (6)`);
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
        WHERE s.name = $2
       ON CONFLICT (code) DO UPDATE
         SET id_service = EXCLUDED.id_service,
             predicate = EXCLUDED.predicate,
             exclusion_message = EXCLUDED.exclusion_message`,
      [rule.code, rule.service, JSON.stringify(rule.predicate), rule.exclusionMessage],
    );
  }

  for (const rule of EXCEPTION_RULES) {
    await manager.query(
      `INSERT INTO irl_catalog.exception_rule
         (code, predicate, action, id_target_service, positions, declared_reason, priority_order)
       SELECT $1, $2::jsonb, $3, s.id, $5, $6, $7
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $4
       ON CONFLICT (code) DO UPDATE
         SET predicate = EXCLUDED.predicate,
             action = EXCLUDED.action,
             id_target_service = EXCLUDED.id_target_service,
             positions = EXCLUDED.positions,
             declared_reason = EXCLUDED.declared_reason,
             priority_order = EXCLUDED.priority_order`,
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

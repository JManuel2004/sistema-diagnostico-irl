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
 * Seeds the routing catalog.
 *
 * Idempotent in the same sense as the rest of the seeder: it can run n
 * times with the same result. The routing configuration is not versioned:
 * if `scoring_parameters` — the singleton table — already has its row, the
 * configuration is considered seeded and is not touched again.
 *
 * It runs inside the runner's transaction, so the configuration ends up
 * complete or not at all. A configuration with profiles but without
 * exception rules would be worse than none: the engine would start and give
 * silently incomplete results.
 */
export async function seedRouting(
  manager: EntityManager,
): Promise<{ configurationSeeded: boolean }> {
  // ── Base catalogs (idempotent by natural key) ──────────────────────
  for (const s of SERVICES) {
    await manager.query(
      `INSERT INTO irl_catalog.portfolio_service (name, description, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
      [s.name, s.description],
    );
  }

  for (const e of STAGES) {
    await manager.query(
      `INSERT INTO irl_catalog.initiative_stage (code, name, sequence, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, sequence = EXCLUDED.sequence`,
      [e.code, e.name, e.order],
    );
  }

  // ── Is the configuration already seeded? ───────────────────────────
  //
  // `scoring_parameters` is a singleton (`ux_scoring_parameters_singleton`):
  // a second insert would violate the index. If it already has its row, the
  // rest of the routing (profiles, rules) was seeded the previous time too.
  const [existing] = await manager.query<{ count: string }[]>(
    `SELECT count(*)::text AS count FROM irl_catalog.scoring_parameters`,
  );
  if (existing && existing.count !== '0') {
    return { configurationSeeded: false };
  }

  // ── Calibration scale ────────────────────────────────────────────
  for (const p of CALIBRATION_SCALE) {
    await manager.query(
      `INSERT INTO irl_catalog.calibration_label_value
         (label, numeric_value, monotonicity_order)
       VALUES ($1, $2, $3)`,
      [p.label, p.value, p.order],
    );
  }

  // ── Scoring parameters ─────────────────────────────────────────────
  const P = SCORING_PARAMETERS;
  await manager.query(
    `INSERT INTO irl_catalog.scoring_parameters
       (bottleneck_weight, gap_weight, moderate_imbalance_weight,
        critical_imbalance_weight, stage_affinity_weight,
        out_of_range_penalty, minimum_threshold, alternatives_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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

  // ── Ordinal profiles + intensities ─────────────────────────────────
  for (const profile of ORDINAL_PROFILES) {
    const stages = profile.relevantStages.join(',');
    const [{ id: idProfile }] = await manager.query<{ id: string }[]>(
      `INSERT INTO irl_catalog.published_ordinal_profile
         (id_service, min_level, max_level, relevant_stages)
       SELECT s.id, $2, $3, $4
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $1
       RETURNING id`,
      [
        profile.service,
        profile.minLevel,
        profile.maxLevel,
        stages,
      ],
    );

    for (const [dimension, label] of Object.entries(profile.intensities)) {
      await manager.query(
        `INSERT INTO irl_catalog.published_ordinal_intensity
           (id_ordinal_profile, id_dimension, label)
         SELECT $1, d.id_dimension, $3
           FROM irl_catalog.dimension d
          WHERE d.code = $2`,
        [idProfile, dimension, label],
      );
    }
  }

  // ── Eligibility rules ───────────────────────────────────────────
  for (const rule of ELIGIBILITY_RULES) {
    await manager.query(
      `INSERT INTO irl_catalog.published_eligibility_rule
         (id_service, predicate, exclusion_message)
       SELECT s.id, $2::jsonb, $3
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $1`,
      [
        rule.service,
        JSON.stringify(rule.predicate),
        rule.exclusionMessage,
      ],
    );
  }

  // ── Exception rules ──────────────────────────────────────────────
  for (const rule of EXCEPTION_RULES) {
    await manager.query(
      `INSERT INTO irl_catalog.published_exception_rule
         (code, predicate, action, id_target_service,
          positions, declared_reason, priority_order)
       SELECT $1, $2::jsonb, $3, s.id, $5, $6, $7
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

  return { configurationSeeded: true };
}

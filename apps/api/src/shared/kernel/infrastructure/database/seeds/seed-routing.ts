import type { EntityManager } from 'typeorm';
import {
  CALIBRATION_SCALE,
  ETAPAS,
  ORDINAL_PROFILES,
  SCORING_PARAMETERS,
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  SERVICES,
} from './data/routing.js';

/**
 * Siembra el catálogo de enrutamiento.
 *
 * Idempotente en el mismo sentido que el resto del seeder: se puede correr
 * n veces y el resultado es el mismo. La configuración de enrutamiento ya
 * no tiene versionado: si `scoring_parameters` —la tabla
 * singleton— ya tiene su fila, la configuración se considera sembrada y no
 * se toca de nuevo.
 *
 * Corre dentro de la transacción del runner, así que la configuración
 * queda completa o no queda nada. Una configuración con fichas pero sin
 * reglas de excepción sería peor que ninguna: el motor arrancaría y daría
 * resultados silenciosamente incompletos.
 */
export async function seedRouting(
  manager: EntityManager,
): Promise<{ configurationSeeded: boolean }> {
  // ── Catálogos base (idempotentes por clave natural) ──────────────────
  for (const s of SERVICES) {
    await manager.query(
      `INSERT INTO irl_catalog.portfolio_service (name, description, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
      [s.name, s.description],
    );
  }

  for (const e of ETAPAS) {
    await manager.query(
      `INSERT INTO irl_catalog.initiative_stage (code, name, sequence, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, sequence = EXCLUDED.sequence`,
      [e.codigo, e.nombre, e.orden],
    );
  }

  // ── ¿Ya está sembrada la configuración? ──────────────────────────────
  //
  // `scoring_parameters` es singleton (`ux_scoring_parameters_singleton`):
  // una segunda inserción violaría el índice. Si ya tiene fila, el resto
  // del enrutamiento (fichas, reglas) también quedó sembrado la vez
  // anterior.
  const [existing] = await manager.query<{ count: string }[]>(
    `SELECT count(*)::text AS count FROM irl_catalog.scoring_parameters`,
  );
  if (existing && existing.count !== '0') {
    return { configurationSeeded: false };
  }

  // ── Escala de calibración ────────────────────────────────────────────
  for (const p of CALIBRATION_SCALE) {
    await manager.query(
      `INSERT INTO irl_catalog.calibration_label_value
         (label, numeric_value, monotonicity_order)
       VALUES ($1, $2, $3)`,
      [p.label, p.value, p.order],
    );
  }

  // ── Parámetros de scoring ─────────────────────────────────────────────
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

  // ── Fichas ordinales + intensities ──────────────────────────────────
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

  // ── Reglas de elegibilidad ───────────────────────────────────────────
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

  // ── Reglas de excepción ──────────────────────────────────────────────
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

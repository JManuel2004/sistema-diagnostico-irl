import type { EntityManager } from 'typeorm';
import { createHash } from 'node:crypto';
import {
  CALIBRATION_SCALE,
  ETAPAS,
  ORDINAL_PROFILES,
  SCORING_PARAMETERS,
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  SERVICES,
} from './data/portfolio-routing.js';

/**
 * Siembra el catálogo de enrutamiento y publica la versión 1.
 *
 * Idempotente en el mismo sentido que el resto del seeder: se puede
 * correr n veces y el resultado es el mismo. Para las tablas versionadas
 * eso no puede hacerse con `ON CONFLICT DO UPDATE`, porque una versión
 * publicada es inmutable por diseño; la estrategia es distinta: si ya
 * existe una versión vigente, no se publica otra.
 *
 * Corre dentro de la transacción del runner, así que la configuración
 * queda completa o no queda nada. Una versión con fichas pero sin reglas
 * de excepción sería peor que ninguna: el motor arrancaría y daría
 * resultados silenciosamente incompletos.
 */
export async function seedPortfolioRouting(
  manager: EntityManager,
): Promise<{ versionPublished: boolean }> {
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

  // ── ¿Ya hay una versión vigente? ─────────────────────────────────────
  //
  // Publicar una segunda violaría `ux_configuration_version_single_active`, y
  // sobrescribir la existente rompería la inmutabilidad de la que ya
  // pueda estar referenciada por recomendaciones emitidas.
  const [active] = await manager.query<{ number: number }[]>(
    `SELECT number FROM irl_catalog.configuration_version WHERE state = 'ACTIVE'`,
  );
  if (active) {
    return { versionPublished: false };
  }

  const AUTHOR = 'seed-inicial';

  // ── Snapshot de calibración ──────────────────────────────────────────
  const [{ id: idCalibration }] = await manager.query<{ id: string }[]>(
    `INSERT INTO irl_catalog.calibration_snapshot (number, author_id, comment, state)
     VALUES (1, $1, $2, 'PUBLISHED')
     RETURNING id`,
    [AUTHOR, 'Escala ordinal inicial — valores hipotéticos pendientes de INNLAB'],
  );

  for (const p of CALIBRATION_SCALE) {
    await manager.query(
      `INSERT INTO irl_catalog.calibration_label_value
         (id_calibration_snapshot, label, numeric_value, monotonicity_order)
       VALUES ($1, $2, $3, $4)`,
      [idCalibration, p.label, p.value, p.order],
    );
  }

  // ── Snapshot de parámetros ───────────────────────────────────────────
  const P = SCORING_PARAMETERS;
  const [{ id: idParameters }] = await manager.query<{ id: string }[]>(
    `INSERT INTO irl_catalog.parameters_snapshot
       (number, author_id, comment, bottleneck_weight, gap_weight,
        moderate_imbalance_weight, critical_imbalance_weight,
        stage_affinity_weight, out_of_range_penalty, minimum_threshold,
        alternatives_count, state)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PUBLISHED')
     RETURNING id`,
    [
      AUTHOR,
      'Pesos iniciales — valores hipotéticos pendientes de INNLAB',
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

  // ── Versión ──────────────────────────────────────────────────────────
  const [{ id: idVersion }] = await manager.query<{ id: string }[]>(
    `INSERT INTO irl_catalog.configuration_version
       (number, author_id, comment, id_calibration_snapshot,
        id_parameters_snapshot, state)
     VALUES (1, $1, $2, $3, $4, 'ACTIVE')
     RETURNING id`,
    [
      AUTHOR,
      'Configuración inicial del motor de enrutamiento (provisional)',
      idCalibration,
      idParameters,
    ],
  );

  // ── Fichas ordinales + intensities ──────────────────────────────────
  for (const profile of ORDINAL_PROFILES) {
    const stages = profile.relevantStages.join(',');
    const [{ id: idProfile }] = await manager.query<{ id: string }[]>(
      `INSERT INTO irl_catalog.published_ordinal_profile
         (id_configuration_version, id_service, min_level, max_level,
          relevant_stages, profile_hash)
       SELECT $1, s.id, $3, $4, $5, $6
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $2
       RETURNING id`,
      [
        idVersion,
        profile.service,
        profile.minLevel,
        profile.maxLevel,
        stages,
        hash({ ...profile }),
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
         (id_configuration_version, id_service, predicate, expression_tree,
          exclusion_message, rule_hash)
       SELECT $1, s.id, $3::jsonb, $4::jsonb, $5, $6
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $2`,
      [
        idVersion,
        rule.service,
        JSON.stringify(rule.predicate),
        JSON.stringify(rule.predicate),
        rule.exclusionMessage,
        hash(rule),
      ],
    );
  }

  // ── Reglas de excepción ──────────────────────────────────────────────
  for (const rule of EXCEPTION_RULES) {
    await manager.query(
      `INSERT INTO irl_catalog.published_exception_rule
         (id_configuration_version, code, predicate, expression_tree, action,
          id_target_service, positions, declared_reason, priority_order,
          rule_hash)
       SELECT $1, $2, $3::jsonb, $4::jsonb, $5, s.id, $7, $8, $9, $10
         FROM irl_catalog.portfolio_service s
        WHERE s.name = $6`,
      [
        idVersion,
        rule.code,
        JSON.stringify(rule.predicate),
        JSON.stringify(rule.predicate),
        rule.action,
        rule.targetService,
        rule.positions,
        rule.declaredReason,
        rule.priorityOrder,
        hash(rule),
      ],
    );
  }

  return { versionPublished: true };
}

/**
 * Huella del artefacto publicado. Sirve para detectar si dos versiones
 * comparten una ficha o regla idéntica sin compararlas campo a campo.
 */
function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

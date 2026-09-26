import type { EntityManager } from 'typeorm';
import { CONSENT_TERMS } from './data/consent-terms.js';
import { CONVERSION_RANGES } from './data/conversion-ranges.js';
import { DIMENSIONS } from './data/dimensions.js';
import { FRAMEWORK_VERSION } from './data/framework-version.js';
import { SECTORS } from './data/sectors.js';
import { STATEMENTS } from './data/statements.js';
import { seedRouting } from './seed-routing.js';
import { seedRoadmapGraph } from './seed-roadmap-graph.js';

/** Averages of 8 Likert answers (1..5) are multiples of 1/8 in [1, 5]. */
const ANSWERS_PER_DIMENSION = 8;

/**
 * Seeds the whole catalog inside the caller's transaction. It writes only
 * `irl_catalog`: transactional data is never seeded.
 *
 * Idempotent: every write is an upsert on a natural key, so it can run any
 * number of times. Separated from `index.ts` (the CLI, which owns the
 * connection and the `.env` loading) so the integration tests run the same
 * seed the `db:seed` command runs.
 *
 * Two kinds of content are **immutable once in use**, because transactional
 * rows point to them: the framework content of a version (statements and
 * conversion table, referenced by diagnostics and answers) and a consent
 * text (referenced by acceptances). Re-running the seed with a different
 * text for a version already in use fails instead of rewriting history; the
 * change goes in a new version.
 */
export async function seedCatalog(manager: EntityManager): Promise<{
  routing: { services: number };
  roadmap: { edges: number };
}> {
  for (const d of DIMENSIONS) {
    await manager.query(
      `INSERT INTO irl_catalog.dimension
         (code, name_es, short_name_es, description, is_critical_dimension,
          sequence, minimum_expected_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE
         SET name_es                = EXCLUDED.name_es,
             short_name_es          = EXCLUDED.short_name_es,
             description            = EXCLUDED.description,
             is_critical_dimension  = EXCLUDED.is_critical_dimension,
             sequence               = EXCLUDED.sequence,
             minimum_expected_level = EXCLUDED.minimum_expected_level`,
      [
        d.code,
        d.nameEs,
        d.shortNameEs,
        d.description,
        d.isCriticalDimension,
        d.sequence,
        d.minimumExpectedLevel,
      ],
    );
  }

  await seedFrameworkVersion(manager);

  const PAIRS: [string, string][] = [
    ['TRL', 'CRL'],
    ['TRL', 'BRL'],
    ['CRL', 'BRL'],
    ['TmRL', 'FRL'],
    ['BRL', 'IPRL'],
    ['TRL', 'IPRL'],
  ];
  for (const [a, b] of PAIRS) {
    await manager.query(
      `INSERT INTO irl_catalog.dimension_pair (id_dimension_a, id_dimension_b, pair_code)
       SELECT da.id_dimension, db.id_dimension, $3
         FROM irl_catalog.dimension da, irl_catalog.dimension db
        WHERE da.code = $1 AND db.code = $2
       ON CONFLICT (pair_code) DO NOTHING`,
      [a, b, `${a}-${b}`],
    );
  }

  for (const name of SECTORS) {
    await manager.query(
      `INSERT INTO irl_catalog.sector (name, is_active)
       VALUES ($1, true)
       ON CONFLICT (name) DO NOTHING`,
      [name],
    );
  }

  await seedConsentTerms(manager);

  // Routing catalog. It runs inside the same transaction: a
  // configuration with profiles but without exception rules would let
  // the engine start and give silently incomplete results.
  const routing = await seedRouting(manager);

  // Dependency graph of the roadmap. It runs after `dimension`
  // because it resolves its FKs by subquery on `code`.
  const roadmap = await seedRoadmapGraph(manager);

  return { routing, roadmap };
}

/**
 * The framework version with its statements and conversion table. A
 * version that some diagnostic already uses cannot change: the seed fails
 * if its content differs from what is stored.
 */
async function seedFrameworkVersion(manager: EntityManager): Promise<number> {
  assertConversionTableCoversEveryAverage();

  const [{ id }] = await manager.query<{ id: number }[]>(
    `INSERT INTO irl_catalog.framework_version (code, published_at)
     VALUES ($1, $2)
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING id`,
    [FRAMEWORK_VERSION.code, FRAMEWORK_VERSION.publishedAt],
  );

  const [{ used }] = await manager.query<{ used: boolean }[]>(
    `SELECT EXISTS (
       SELECT 1 FROM irl_diagnostic.diagnostic WHERE id_framework_version = $1
     ) AS used`,
    [id],
  );

  if (used) {
    await assertVersionUnchanged(manager, id);
    return id;
  }

  for (const s of STATEMENTS) {
    await manager.query(
      `INSERT INTO irl_catalog.statement (id_framework_version, id_dimension, sequence, text_es)
       SELECT $1, d.id_dimension, $3, $4
         FROM irl_catalog.dimension d
        WHERE d.code = $2
       ON CONFLICT (id_framework_version, id_dimension, sequence) DO UPDATE
         SET text_es = EXCLUDED.text_es`,
      [id, s.dimensionCode, s.sequence, s.textEs],
    );
  }

  // Replaced whole: an upsert range by range could overlap an old range in
  // the middle of the loop and violate `ex_conversion_range_overlap`.
  await manager.query(
    `DELETE FROM irl_catalog.conversion_range WHERE id_framework_version = $1`,
    [id],
  );
  for (const r of CONVERSION_RANGES) {
    await manager.query(
      `INSERT INTO irl_catalog.conversion_range (id_framework_version, irl_level, avg_min, avg_max)
       VALUES ($1, $2, $3, $4)`,
      [id, r.irlLevel, r.avgMin, r.avgMax],
    );
  }
  return id;
}

/** Fails if the stored content of a version in use differs from the seed's. */
async function assertVersionUnchanged(manager: EntityManager, versionId: number): Promise<void> {
  const statements = await manager.query<{ code: string; sequence: number; text_es: string }[]>(
    `SELECT d.code, s.sequence, s.text_es
       FROM irl_catalog.statement s
       JOIN irl_catalog.dimension d ON d.id_dimension = s.id_dimension
      WHERE s.id_framework_version = $1`,
    [versionId],
  );
  const stored = new Map(statements.map((s) => [`${s.code}-${String(s.sequence)}`, s.text_es]));
  const changedStatement = STATEMENTS.find(
    (s) => stored.get(`${s.dimensionCode}-${String(s.sequence)}`) !== s.textEs,
  );

  const ranges = await manager.query<{ irl_level: number; avg_min: string; avg_max: string }[]>(
    `SELECT irl_level, avg_min, avg_max FROM irl_catalog.conversion_range
      WHERE id_framework_version = $1`,
    [versionId],
  );
  const storedRanges = new Map(
    ranges.map((r) => [r.irl_level, [Number(r.avg_min), Number(r.avg_max)] as const]),
  );
  const changedRange = CONVERSION_RANGES.find((r) => {
    const current = storedRanges.get(r.irlLevel);
    return current?.[0] !== r.avgMin || current[1] !== r.avgMax;
  });

  if (changedStatement || changedRange || statements.length !== STATEMENTS.length) {
    throw new Error(
      `Framework version ${FRAMEWORK_VERSION.code} is already used by diagnostics and its ` +
        'content differs from the seed. Publish the change as a new framework version ' +
        '(data/framework-version.ts) instead of rewriting this one.',
    );
  }
}

/**
 * Every average 8 Likert answers can produce (k/8 for k = 8..40) must fall
 * in exactly one range of the conversion table (SA-06). The database
 * prevents overlaps; this also rules out gaps.
 */
function assertConversionTableCoversEveryAverage(): void {
  for (let sum = ANSWERS_PER_DIMENSION; sum <= ANSWERS_PER_DIMENSION * 5; sum++) {
    const average = sum / ANSWERS_PER_DIMENSION;
    const matches = CONVERSION_RANGES.filter((r) => average >= r.avgMin && average <= r.avgMax);
    if (matches.length !== 1) {
      throw new Error(
        `Conversion table covers the average ${String(average)} ${String(matches.length)} times; ` +
          'it must cover every reachable average exactly once.',
      );
    }
  }
}

/** Consent texts. A version with acceptances cannot change. */
async function seedConsentTerms(manager: EntityManager): Promise<void> {
  for (const terms of CONSENT_TERMS) {
    const [existing] = await manager.query<
      { title: string; sections: unknown; checkbox_label: string; accepted: boolean }[]
    >(
      `SELECT t.title, t.sections, t.checkbox_label,
              EXISTS (SELECT 1 FROM irl_diagnostic.consent c WHERE c.terms_version = t.version) AS accepted
         FROM irl_catalog.consent_terms t
        WHERE t.version = $1`,
      [terms.version],
    );

    if (existing?.accepted) {
      const same =
        existing.title === terms.title &&
        existing.checkbox_label === terms.checkboxLabel &&
        JSON.stringify(existing.sections) === JSON.stringify(terms.sections);
      if (!same) {
        throw new Error(
          `Consent terms ${terms.version} already have acceptances and their text differs ` +
            'from the seed. Publish the change as a new version (data/consent-terms.ts).',
        );
      }
      continue;
    }

    await manager.query(
      `INSERT INTO irl_catalog.consent_terms (version, title, sections, checkbox_label, published_at)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (version) DO UPDATE
         SET title = EXCLUDED.title,
             sections = EXCLUDED.sections,
             checkbox_label = EXCLUDED.checkbox_label,
             published_at = EXCLUDED.published_at`,
      [terms.version, terms.title, JSON.stringify(terms.sections), terms.checkboxLabel, terms.publishedAt],
    );
  }
}

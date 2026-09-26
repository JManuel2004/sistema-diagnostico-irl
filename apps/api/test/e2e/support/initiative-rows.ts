import type { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

/**
 * Inserts, straight into the database, an initiative of `ownerId` with its
 * consent accepted at `v1` and the AgroConecta profile as the snapshot of
 * `diagnosticId`. For suites that test what comes after the wizard (routing,
 * deep analysis); `initiative/registration-flow` covers the HTTP path.
 *
 * Returns the initiative id: deleting the diagnostic removes the snapshot,
 * but the initiative (and its consent) outlive it, so the suite deletes it.
 */
export async function insertInitiativeWithProfile(
  dataSource: DataSource,
  diagnosticId: string,
  ownerId: string,
): Promise<string> {
  const initiativeId = randomUUID();
  await dataSource.query(
    `INSERT INTO irl_diagnostic.initiative (id, cognito_user_id) VALUES ($1, $2)`,
    [initiativeId, ownerId],
  );
  await dataSource.query(
    `INSERT INTO irl_diagnostic.consent (id, id_initiative, cognito_user_id, terms_version, accepted_at)
     VALUES ($1, $2, $3, 'v1', now())`,
    [randomUUID(), initiativeId, ownerId],
  );
  await dataSource.query(
    `INSERT INTO irl_catalog.sector (name, is_active)
     VALUES ('Agroindustria', true)
     ON CONFLICT (name) DO NOTHING`,
  );
  await dataSource.query(
    `INSERT INTO irl_diagnostic.initiative_profile
       (id, id_initiative, id_diagnostic, id_sector, name, product_type,
        id_stage, declared_stage, team_size, team_description,
        academic_linkage, target_market, current_funding)
     SELECT $1, $2, $3, s.id, 'AgroConecta',
            'Plataforma de trazabilidad y comercialización de café',
            e.id, 'Piloto completado', 3, 'Fundadora, coordinadora y desarrollador externo',
            false, 'Productores de café del suroccidente', 'Ahorros de la fundadora'
       FROM irl_catalog.sector s, irl_catalog.initiative_stage e
      WHERE s.name = 'Agroindustria' AND e.code = 'validacion'`,
    [randomUUID(), initiativeId, diagnosticId],
  );
  return initiativeId;
}

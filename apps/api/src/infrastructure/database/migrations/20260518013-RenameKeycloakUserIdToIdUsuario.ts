import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames `keycloak_user_id` to `id_usuario` across the four tables that
 * reference the person who owns a record.
 *
 * The column was named after Keycloak, the identity provider assumed when
 * the schema was drafted. The ecosystem authenticates against a shared
 * Cognito pool instead, so the name now points at a service the system
 * never talks to — and a reader has no way to tell that from the schema.
 *
 * The replacement is deliberately provider-neutral rather than
 * `cognito_user_id`: the value is whoever owns the row, and naming it
 * after whichever service happens to issue the identifier is what caused
 * this rename in the first place. `id_usuario` also matches the Spanish
 * convention the rest of the schema already follows (`id_diagnostico`,
 * `fecha_inicio`, `version_marco_irl`).
 *
 * The value itself does not change: it is still the identifier of the
 * person in the INNLAB ecosystem — today the Cognito `sub`, the same
 * across every product. It stays a logical reference with no foreign key,
 * because the users live in Core's database and the two are never joined.
 *
 * Earlier migrations are left untouched on purpose. A fresh database
 * creates the old name and renames it here; an existing one is renamed in
 * place. Both converge, and the applied history stays honest.
 */
export class RenameKeycloakUserIdToIdUsuario1747526400013
  implements MigrationInterface
{
  name = 'RenameKeycloakUserIdToIdUsuario1747526400013';

  private static readonly TABLES = [
    'diagnostico',
    'consentimiento',
    'descarga_reporte',
    'evento_auditoria',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of RenameKeycloakUserIdToIdUsuario1747526400013.TABLES) {
      await queryRunner.query(
        `ALTER TABLE irl_diagnostic.${table} RENAME COLUMN keycloak_user_id TO id_usuario`,
      );
    }

    // The index name carried the provider too; renaming the column alone
    // would leave `ix_diagnostico_keycloak` pointing at `id_usuario`.
    await queryRunner.query(
      `ALTER INDEX irl_diagnostic.ix_diagnostico_keycloak RENAME TO ix_diagnostico_usuario`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX irl_diagnostic.ix_diagnostico_usuario RENAME TO ix_diagnostico_keycloak`,
    );

    for (const table of RenameKeycloakUserIdToIdUsuario1747526400013.TABLES) {
      await queryRunner.query(
        `ALTER TABLE irl_diagnostic.${table} RENAME COLUMN id_usuario TO keycloak_user_id`,
      );
    }
  }
}

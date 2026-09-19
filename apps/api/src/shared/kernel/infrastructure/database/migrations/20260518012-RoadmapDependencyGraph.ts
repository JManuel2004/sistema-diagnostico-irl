import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dependency graph backing the scaling roadmap (RF-14).
 *
 * Two artefacts, both reference data seeded once and read-only at
 * runtime, so both live in `irl_catalog` alongside `texto_roadmap`,
 * `servicio_portafolio` and the routing configuration.
 *
 *   - `dimension.nivel_minimo_esperado` — the IRL level a dimension is
 *     expected to reach for the initiative to be considered balanced.
 *     A column rather than a 1:1 table: the schema has to admit a value
 *     per dimension without pretending a single global number exists,
 *     and a column says exactly that with nothing extra.
 *
 *   - `dependencia_dimension` — directed edges "origen enables destino,
 *     provided origen reaches nivel_minimo_requerido". This is the graph
 *     the topological ordering walks.
 *
 * The `DEFAULT 4` on the new column exists only so the migration can
 * apply over the six rows already seeded without failing. It is NOT the
 * business value: the seed sets all six explicitly, and that is the
 * source of truth.
 *
 * NOTE — acyclicity is deliberately NOT enforced here. `UNIQUE (origen,
 * destino)` stops duplicate edges but cannot see that A→B→C→A closes a
 * loop; catching that in SQL would need a recursive trigger, which is
 * disproportionate for a nine-row seeded table. It is enforced three
 * times in code instead: at seed import, at `DependencyGraph.create()`,
 * and again inside the layering service as a last resort.
 */
export class RoadmapDependencyGraph1747526400012 implements MigrationInterface {
  name = 'RoadmapDependencyGraph1747526400012';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.dimension.nivel_minimo_esperado ──────────────────────
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension
        ADD COLUMN nivel_minimo_esperado smallint NOT NULL DEFAULT 4
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension
        ADD CONSTRAINT ck_dimension_nivel_minimo
        CHECK (nivel_minimo_esperado BETWEEN 1 AND 9)
    `);

    // ── irl_catalog.dependencia_dimension ────────────────────────────────
    //
    // FKs to `dimension` rather than a varchar code: origen and destino
    // are guaranteed to be real framework dimensions by referential
    // integrity, and the `CHECK (codigo IN ('TRL',...))` on `dimension`
    // is inherited transitively. It also avoids repeating the fragile
    // `codigo_par` pattern of `par_dimension`, whose 'A-B' string the
    // repositories have to split back apart on every read.
    await queryRunner.query(`
      CREATE TABLE irl_catalog.dependencia_dimension (
        id_dependencia         integer  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_dimension_origen    integer  NOT NULL,
        id_dimension_destino   integer  NOT NULL,
        nivel_minimo_requerido smallint NOT NULL,
        activa                 boolean  NOT NULL DEFAULT true,
        CONSTRAINT uq_dependencia_par
          UNIQUE (id_dimension_origen, id_dimension_destino),
        CONSTRAINT ck_dependencia_no_reflexiva
          CHECK (id_dimension_origen <> id_dimension_destino),
        CONSTRAINT ck_dependencia_nivel_requerido
          CHECK (nivel_minimo_requerido BETWEEN 1 AND 9),
        CONSTRAINT fk_dependencia_origen FOREIGN KEY (id_dimension_origen)
          REFERENCES irl_catalog.dimension (id_dimension),
        CONSTRAINT fk_dependencia_destino FOREIGN KEY (id_dimension_destino)
          REFERENCES irl_catalog.dimension (id_dimension)
      )
    `);

    // The closure step walks *incoming* edges by destino; without this
    // index that is a sequential scan. Lookups by origen are already
    // covered by the leading column of the unique constraint's index.
    await queryRunner.query(`
      CREATE INDEX ix_dependencia_destino
        ON irl_catalog.dependencia_dimension (id_dimension_destino)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.dependencia_dimension`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension
        DROP CONSTRAINT IF EXISTS ck_dimension_nivel_minimo
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension
        DROP COLUMN IF EXISTS nivel_minimo_esperado
    `);
  }
}

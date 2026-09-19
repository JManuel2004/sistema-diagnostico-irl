import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Translates the values stored in `imbalance_analysis.classification`.
 *
 * The previous migration renamed the column but left its contents in
 * Spanish, so a table with an English name held `CRITICO`. The vocabulary
 * is one thing: the column, the domain type and the values it admits all
 * say the same word now.
 *
 * Order matters. The CHECK names the literals, so it has to be widened
 * before the rows change and narrowed again afterwards; dropping and
 * recreating it is the only way, a rename would reject every row.
 */
const VALUES: readonly (readonly [string, string])[] = [
  ['CRITICO', 'CRITICAL'],
  ['MODERADO', 'MODERATE'],
  ['ACEPTABLE', 'ACCEPTABLE'],
];

const CHECK = 'ck_imbalance_analysis_classification';

export class EnglishImbalanceClassificationValues1747526400019
  implements MigrationInterface
{
  name = 'EnglishImbalanceClassificationValues1747526400019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis DROP CONSTRAINT ${CHECK}`,
    );

    for (const [from, to] of VALUES) {
      await queryRunner.query(
        `UPDATE irl_diagnostic.imbalance_analysis SET classification = $2 WHERE classification = $1`,
        [from, to],
      );
    }

    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis
         ADD CONSTRAINT ${CHECK}
         CHECK (classification IN ('CRITICAL', 'MODERATE', 'ACCEPTABLE'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis DROP CONSTRAINT ${CHECK}`,
    );

    for (const [from, to] of VALUES) {
      await queryRunner.query(
        `UPDATE irl_diagnostic.imbalance_analysis SET classification = $1 WHERE classification = $2`,
        [from, to],
      );
    }

    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis
         ADD CONSTRAINT ${CHECK}
         CHECK (classification IN ('CRITICO', 'MODERADO', 'ACEPTABLE'))`,
    );
  }
}

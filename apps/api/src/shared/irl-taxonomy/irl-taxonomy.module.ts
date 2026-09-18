import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionOrm } from './infrastructure/database/orm-entities/dimension.orm-entity.js';
import { ConversionRangeOrm } from './infrastructure/database/orm-entities/conversion-range.orm-entity.js';
import { DimensionPairOrm } from './infrastructure/database/orm-entities/dimension-pair.orm-entity.js';
import { TypeOrmTaxonomyRepository } from './infrastructure/database/repositories/typeorm-taxonomy.repository.js';
import { TAXONOMY_REPOSITORY } from './domain/repositories/taxonomy.repository.port.js';

/**
 * `IrlTaxonomyModule` — Shared Kernel bounded context for the six IRL
 * dimensions, the SA-06 conversion table, and the six fixed imbalance
 * pairs (`convenciones-objetivo.md` §1.1).
 *
 * `DimensionOrm` is also registered directly by other modules today
 * (`diagnosis/`, and — until Oleada 5 corrects it — `scaling-roadmap`)
 * instead of going through `TAXONOMY_REPOSITORY`. `routing/` was fixed to
 * use the port in Oleada 4. The remaining case is the pre-existing
 * "acceso cruzado a DimensionOrm" deuda (backlog 1.3/3.2), unchanged by
 * this module's introduction — it gives that module a port to switch to,
 * it does not switch it itself.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DimensionOrm, ConversionRangeOrm, DimensionPairOrm]),
  ],
  providers: [
    { provide: TAXONOMY_REPOSITORY, useClass: TypeOrmTaxonomyRepository },
  ],
  exports: [TAXONOMY_REPOSITORY],
})
export class IrlTaxonomyModule {}

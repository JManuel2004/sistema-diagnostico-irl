import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionOrm } from './infrastructure/database/orm-entities/dimension.orm-entity.js';
import { ConversionRangeOrm } from './infrastructure/database/orm-entities/conversion-range.orm-entity.js';
import { DimensionPairOrm } from './infrastructure/database/orm-entities/dimension-pair.orm-entity.js';
import { FrameworkVersionOrm } from './infrastructure/database/orm-entities/framework-version.orm-entity.js';
import { DimensionLevelDescriptionOrm } from './infrastructure/database/orm-entities/dimension-level-description.orm-entity.js';
import { GlobalLevelDescriptionOrm } from './infrastructure/database/orm-entities/global-level-description.orm-entity.js';
import { TypeOrmTaxonomyRepository } from './infrastructure/database/repositories/typeorm-taxonomy.repository.js';
import { TAXONOMY_REPOSITORY } from './domain/repositories/taxonomy.repository.port.js';

/**
 * `IrlTaxonomyModule` — Shared Kernel bounded context for the six IRL
 * dimensions, the SA-06 conversion table, and the six fixed imbalance
 * pairs.
 *
 * Every other module reads it through `TAXONOMY_REPOSITORY`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DimensionOrm,
      ConversionRangeOrm,
      DimensionPairOrm,
      FrameworkVersionOrm,
      DimensionLevelDescriptionOrm,
      GlobalLevelDescriptionOrm,
    ]),
  ],
  providers: [
    { provide: TAXONOMY_REPOSITORY, useClass: TypeOrmTaxonomyRepository },
  ],
  exports: [TAXONOMY_REPOSITORY],
})
export class IrlTaxonomyModule {}

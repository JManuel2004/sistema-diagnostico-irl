import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionOrm } from './infrastructure/persistence/entities/dimension.orm-entity.js';
import { StatementOrm } from './infrastructure/persistence/entities/statement.orm-entity.js';
import { ConversionRangeOrm } from './infrastructure/persistence/entities/conversion-range.orm-entity.js';
import { DimensionPairOrm } from './infrastructure/persistence/entities/dimension-pair.orm-entity.js';
import { TypeOrmIrlCatalogRepository } from './infrastructure/persistence/typeorm-irl-catalog.repository.js';
import {
  IRL_CATALOG_REPOSITORY,
  type IrlCatalogRepositoryPort,
} from './domain/ports/irl-catalog.repository.port.js';
import { IrlCatalogController } from './interfaces/http/irl-catalog.controller.js';
import { GetQuestionnaireStructureQuery } from './application/queries/get-questionnaire-structure.query.js';

/**
 * `IrlCatalogModule` — bounded context for the read-only KTH IRL
 * catalogs (dimensions, statements, conversion ranges, dimension pairs).
 *
 * The repository port is bound by symbol (`IRL_CATALOG_REPOSITORY`)
 * so consumers depend on the port, not the concrete adapter. The port
 * is **exported** because at least two modules (questionnaire,
 * maturity-profile) need to read catalog data — modules communicate
 * by id and through ports, never by reaching into another module's
 * internals.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DimensionOrm,
      StatementOrm,
      ConversionRangeOrm,
      DimensionPairOrm,
    ]),
  ],
  providers: [
    { provide: IRL_CATALOG_REPOSITORY, useClass: TypeOrmIrlCatalogRepository },
    {
      provide: GetQuestionnaireStructureQuery,
      useFactory: (repo: IrlCatalogRepositoryPort) =>
        new GetQuestionnaireStructureQuery(repo),
      inject: [IRL_CATALOG_REPOSITORY],
    },
  ],
  controllers: [IrlCatalogController],
  exports: [IRL_CATALOG_REPOSITORY],
})
export class IrlCatalogModule {}

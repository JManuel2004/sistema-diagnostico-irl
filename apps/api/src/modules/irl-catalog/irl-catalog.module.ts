import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionOrm } from './infrastructure/persistence/entities/dimension.orm-entity.js';
import { AfirmacionOrm } from './infrastructure/persistence/entities/afirmacion.orm-entity.js';
import { RangoConversionOrm } from './infrastructure/persistence/entities/rango-conversion.orm-entity.js';
import { ParDimensionOrm } from './infrastructure/persistence/entities/par-dimension.orm-entity.js';
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
 * internals (root CLAUDE.md).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DimensionOrm,
      AfirmacionOrm,
      RangoConversionOrm,
      ParDimensionOrm,
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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IrlCatalogRepositoryPort } from '../../domain/ports/irl-catalog.repository.port.js';
import { Dimension } from '../../domain/dimension.js';
import { Statement } from '../../domain/statement.js';
import { ConversionRange } from '../../domain/conversion-range.js';
import { DimensionPair } from '../../domain/dimension-pair.js';
import { DimensionOrm } from './entities/dimension.orm-entity.js';
import { AfirmacionOrm } from './entities/afirmacion.orm-entity.js';
import { RangoConversionOrm } from './entities/rango-conversion.orm-entity.js';
import { ParDimensionOrm } from './entities/par-dimension.orm-entity.js';

/**
 * TypeORM-backed adapter for the catalog port.
 *
 * All four catalog tables are immutable at runtime (PROJECT-SUMMARY
 * §1.8). Methods perform plain reads; there is no `save`, `delete`, or
 * write-side method by design — updates ship through migrations + seeds.
 *
 * ORM rows are mapped to domain objects via the static `fromPersistence`
 * factories on each domain class so ORM types do not leak across the
 * boundary (CLAUDE.api.md §"Repository pattern").
 */
@Injectable()
export class TypeOrmIrlCatalogRepository implements IrlCatalogRepositoryPort {
  constructor(
    @InjectRepository(DimensionOrm)
    private readonly dimensions: Repository<DimensionOrm>,
    @InjectRepository(AfirmacionOrm)
    private readonly afirmaciones: Repository<AfirmacionOrm>,
    @InjectRepository(RangoConversionOrm)
    private readonly rangos: Repository<RangoConversionOrm>,
    @InjectRepository(ParDimensionOrm)
    private readonly pares: Repository<ParDimensionOrm>,
  ) {}

  async findAllDimensions(): Promise<Dimension[]> {
    const rows = await this.dimensions.find({ order: { orden: 'ASC' } });
    return rows.map((r) =>
      Dimension.fromPersistence({
        id: r.idDimension,
        code: r.codigo,
        name: r.nombre,
        description: r.descripcion,
        sequence: r.orden,
      }),
    );
  }

  async findAllStatements(): Promise<Statement[]> {
    const rows = await this.afirmaciones.find({
      relations: { dimension: true },
      order: { dimension: { orden: 'ASC' }, orden: 'ASC' },
    });
    return rows.map((r) =>
      Statement.fromPersistence({
        id: r.idAfirmacion,
        dimensionId: r.idDimension,
        dimensionCode: r.dimension.codigo,
        sequence: r.orden,
        text: r.texto,
      }),
    );
  }

  async findStatementsByDimensionCode(code: string): Promise<Statement[]> {
    const rows = await this.afirmaciones.find({
      where: { dimension: { codigo: code } },
      relations: { dimension: true },
      order: { orden: 'ASC' },
    });
    return rows.map((r) =>
      Statement.fromPersistence({
        id: r.idAfirmacion,
        dimensionId: r.idDimension,
        dimensionCode: r.dimension.codigo,
        sequence: r.orden,
        text: r.texto,
      }),
    );
  }

  async findAllConversionRanges(): Promise<ConversionRange[]> {
    const rows = await this.rangos.find({ order: { nivelIrl: 'ASC' } });
    return rows.map((r) =>
      ConversionRange.fromPersistence({
        avgMin: r.avgMin,
        avgMax: r.avgMax,
        irlLevel: r.nivelIrl,
      }),
    );
  }

  async findAllDimensionPairs(): Promise<DimensionPair[]> {
    const rows = await this.pares.find();
    return rows.map((r) =>
      DimensionPair.fromPersistence({
        id: r.idPar,
        leftCode: r.codigoIzq,
        rightCode: r.codigoDer,
      }),
    );
  }
}

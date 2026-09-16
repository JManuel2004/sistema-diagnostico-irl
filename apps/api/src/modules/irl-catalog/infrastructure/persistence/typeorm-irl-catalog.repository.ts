import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IrlCatalogRepositoryPort } from '../../domain/ports/irl-catalog.repository.port.js';
import { Dimension } from '../../domain/dimension.js';
import { Statement } from '../../domain/statement.js';
import { ConversionRange } from '../../domain/conversion-range.js';
import { DimensionPair } from '../../domain/dimension-pair.js';
import { DimensionOrm } from './entities/dimension.orm-entity.js';
import { StatementOrm } from './entities/statement.orm-entity.js';
import { ConversionRangeOrm } from './entities/conversion-range.orm-entity.js';
import { DimensionPairOrm } from './entities/dimension-pair.orm-entity.js';

/**
 * TypeORM-backed adapter for the catalog port.
 *
 * All four catalog tables are immutable at runtime (PROJECT-SUMMARY
 * §1.8). Methods perform plain reads; there is no `save`, `delete`, or
 * write-side method by design — updates ship through migrations + seeds.
 *
 * ORM rows are mapped to domain objects via the static `fromPersistence`
 * factories on each domain class so ORM types do not leak across the
 * boundary (see the repository-pattern convention for this backend).
 */
@Injectable()
export class TypeOrmIrlCatalogRepository implements IrlCatalogRepositoryPort {
  constructor(
    @InjectRepository(DimensionOrm)
    private readonly dimensions: Repository<DimensionOrm>,
    @InjectRepository(StatementOrm)
    private readonly statements: Repository<StatementOrm>,
    @InjectRepository(ConversionRangeOrm)
    private readonly ranges: Repository<ConversionRangeOrm>,
    @InjectRepository(DimensionPairOrm)
    private readonly pairs: Repository<DimensionPairOrm>,
  ) {}

  async findAllDimensions(): Promise<Dimension[]> {
    const rows = await this.dimensions.find({ order: { sequence: 'ASC' } });
    return rows.map((r) =>
      Dimension.fromPersistence({
        id: r.idDimension,
        code: r.code,
        name: r.nameEs,
        description: r.description,
        sequence: r.sequence,
      }),
    );
  }

  async findAllStatements(): Promise<Statement[]> {
    const rows = await this.statements.find({
      relations: { dimension: true },
      order: { dimension: { sequence: 'ASC' }, sequence: 'ASC' },
    });
    return rows.map((r) =>
      Statement.fromPersistence({
        id: r.idStatement,
        dimensionId: r.idDimension,
        dimensionCode: r.dimension.code,
        sequence: r.sequence,
        text: r.textEs,
      }),
    );
  }

  async findStatementsByDimensionCode(code: string): Promise<Statement[]> {
    const rows = await this.statements.find({
      where: { dimension: { code } },
      relations: { dimension: true },
      order: { sequence: 'ASC' },
    });
    return rows.map((r) =>
      Statement.fromPersistence({
        id: r.idStatement,
        dimensionId: r.idDimension,
        dimensionCode: r.dimension.code,
        sequence: r.sequence,
        text: r.textEs,
      }),
    );
  }

  async findAllConversionRanges(): Promise<ConversionRange[]> {
    const rows = await this.ranges.find({ order: { irlLevel: 'ASC' } });
    return rows.map((r) =>
      ConversionRange.fromPersistence({
        avgMin: r.avgMin,
        avgMax: r.avgMax,
        irlLevel: r.irlLevel,
      }),
    );
  }

  async findAllDimensionPairs(): Promise<DimensionPair[]> {
    const rows = await this.pairs.find();
    return rows.map((r) => {
      const [leftCode = '', rightCode = ''] = r.pairCode.split('-');
      return DimensionPair.fromPersistence({
        id: r.idPair,
        leftCode,
        rightCode,
      });
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TaxonomyRepositoryPort } from '../../../domain/repositories/taxonomy.repository.port.js';
import { Dimension } from '../../../domain/entities/dimension.js';
import { ConversionRange } from '../../../domain/entities/conversion-range.js';
import { DimensionPair } from '../../../domain/entities/dimension-pair.js';
import { DimensionOrm } from '../orm-entities/dimension.orm-entity.js';
import { ConversionRangeOrm } from '../orm-entities/conversion-range.orm-entity.js';
import { DimensionPairOrm } from '../orm-entities/dimension-pair.orm-entity.js';
import { FrameworkVersionOrm } from '../orm-entities/framework-version.orm-entity.js';
import { FrameworkVersion } from '../../../domain/entities/framework-version.js';

/**
 * TypeORM-backed adapter for the taxonomy port.
 *
 * All three tables are immutable at runtime — plain reads only, no
 * `save`/`delete`. ORM rows are mapped to domain objects via each
 * class's static `fromPersistence` factory so ORM types never leak
 * across the port boundary.
 */
@Injectable()
export class TypeOrmTaxonomyRepository implements TaxonomyRepositoryPort {
  constructor(
    @InjectRepository(DimensionOrm)
    private readonly dimensions: Repository<DimensionOrm>,
    @InjectRepository(ConversionRangeOrm)
    private readonly ranges: Repository<ConversionRangeOrm>,
    @InjectRepository(DimensionPairOrm)
    private readonly pairs: Repository<DimensionPairOrm>,
    @InjectRepository(FrameworkVersionOrm)
    private readonly versions: Repository<FrameworkVersionOrm>,
  ) {}

  async findAllDimensions(): Promise<Dimension[]> {
    const rows = await this.dimensions.find({ order: { sequence: 'ASC' } });
    return rows.map((r) =>
      Dimension.fromPersistence({
        id: r.idDimension,
        code: r.code,
        name: r.nameEs,
        shortName: r.shortNameEs,
        description: r.description,
        sequence: r.sequence,
        minimumExpectedLevel: r.minimumExpectedLevel,
        isCriticalDimension: r.isCriticalDimension,
      }),
    );
  }

  async findCurrentFrameworkVersion(): Promise<FrameworkVersion | null> {
    const [row] = await this.versions.find({ order: { publishedAt: 'DESC' }, take: 1 });
    return row ? FrameworkVersion.fromPersistence(row) : null;
  }

  async findFrameworkVersionById(id: number): Promise<FrameworkVersion | null> {
    const row = await this.versions.findOne({ where: { id } });
    return row ? FrameworkVersion.fromPersistence(row) : null;
  }

  async findFrameworkVersionByCode(code: string): Promise<FrameworkVersion | null> {
    const row = await this.versions.findOne({ where: { code } });
    return row ? FrameworkVersion.fromPersistence(row) : null;
  }

  async findConversionRanges(frameworkVersionId: number): Promise<ConversionRange[]> {
    const rows = await this.ranges.find({
      where: { idFrameworkVersion: frameworkVersionId },
      order: { irlLevel: 'ASC' },
    });
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

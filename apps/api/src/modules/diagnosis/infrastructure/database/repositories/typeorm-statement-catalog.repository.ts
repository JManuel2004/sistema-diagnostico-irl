import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { StatementCatalogPort } from '../../../domain/repositories/statement-catalog.port.js';
import { Statement } from '../../../domain/entities/statement.js';
import { StatementOrm } from '../orm-entities/statement.orm-entity.js';
import {
  TAXONOMY_REPOSITORY,
  type TaxonomyRepositoryPort,
} from '../../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';

/**
 * Reads the 48 statements. The dimension each one belongs to (its code and
 * its display order) comes from `shared/irl-taxonomy/` through its port.
 */
@Injectable()
export class TypeOrmStatementCatalogRepository implements StatementCatalogPort {
  constructor(
    @InjectRepository(StatementOrm)
    private readonly statements: Repository<StatementOrm>,
    @Inject(TAXONOMY_REPOSITORY)
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async findAllStatements(): Promise<Statement[]> {
    const dimensions = await this.taxonomy.findAllDimensions();
    const rows = await this.statements.find({ order: { sequence: 'ASC' } });
    return dimensions.flatMap((dimension) =>
      rows
        .filter((row) => row.idDimension === dimension.id)
        .map((row) => toStatement(row, dimension.code.value)),
    );
  }

  async findStatementsByDimensionCode(code: string): Promise<Statement[]> {
    const dimension = (await this.taxonomy.findAllDimensions()).find(
      (d) => d.code.value === code,
    );
    if (!dimension) return [];
    const rows = await this.statements.find({
      where: { idDimension: dimension.id },
      order: { sequence: 'ASC' },
    });
    return rows.map((row) => toStatement(row, code));
  }
}

function toStatement(row: StatementOrm, dimensionCode: string): Statement {
  return Statement.fromPersistence({
    id: row.idStatement,
    dimensionId: row.idDimension,
    dimensionCode,
    sequence: row.sequence,
    text: row.textEs,
  });
}

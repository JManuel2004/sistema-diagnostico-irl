import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { StatementCatalogPort } from '../../../domain/repositories/statement-catalog.port.js';
import { Statement } from '../../../domain/entities/statement.js';
import { StatementOrm } from '../orm-entities/statement.orm-entity.js';

/**
 * TypeORM-backed adapter for `StatementCatalogPort`.
 *
 * Immutable at runtime, plain reads only — same convention as the rest
 * of the catalog adapters (see `TypeOrmTaxonomyRepository`).
 */
@Injectable()
export class TypeOrmStatementCatalogRepository implements StatementCatalogPort {
  constructor(
    @InjectRepository(StatementOrm)
    private readonly statements: Repository<StatementOrm>,
  ) {}

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
}

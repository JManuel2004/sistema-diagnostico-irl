import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AnswerSheetRepositoryPort } from '../../../domain/repositories/answer-sheet.repository.port.js';
import { AnswerSheet } from '../../../domain/entities/answer-sheet.aggregate.js';
import { Uuid } from '../../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { AnswerOrm } from '../orm-entities/answer.orm-entity.js';

/**
 * TypeORM-backed adapter for the `AnswerSheet` aggregate.
 *
 * Save policy: replace-all in a single transaction. DELETE then INSERT
 * inside a transaction guarantees the persisted state mirrors the
 * aggregate exactly. The `UNIQUE (id_diagnostic, id_statement)` DB
 * constraint provides defense-in-depth against duplicate answers.
 *
 * `id` is a bigint GENERATED ALWAYS AS IDENTITY — never set it
 * explicitly. `id_statement` is also a bigint (from
 * `irl_catalog.statement`), represented as a string in TypeORM.
 */
@Injectable()
export class TypeOrmAnswerSheetRepository implements AnswerSheetRepositoryPort {
  constructor(
    @InjectRepository(AnswerOrm)
    private readonly orm: Repository<AnswerOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<AnswerSheet | null> {
    const rows = await this.orm.find({
      where: { idDiagnostico: diagnosticId },
      order: { idStatement: 'ASC' },
    });
    if (rows.length === 0) return null;

    return AnswerSheet.fromPersistence(
      Uuid.create(diagnosticId),
      rows.map((r) => ({
        statementId: r.idStatement,
        value: r.likertValue,
        justification: r.justification,
      })),
    );
  }

  async save(sheet: AnswerSheet): Promise<void> {
    const snapshot = sheet.toPersistence();

    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(AnswerOrm, {
        idDiagnostico: sheet.diagnosticId.value,
      });
      if (snapshot.length > 0) {
        const rows = snapshot.map((a) =>
          manager.create(AnswerOrm, {
            idDiagnostico: sheet.diagnosticId.value,
            idStatement: a.statementId,
            likertValue: a.value,
            justification: a.justification,
          }),
        );
        await manager.insert(AnswerOrm, rows);
      }
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AnswerSheetRepositoryPort } from '../../domain/ports/answer-sheet.repository.port.js';
import { AnswerSheet } from '../../domain/entities/answer-sheet.aggregate.js';
import { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { RespuestaOrm } from './respuesta.orm-entity.js';

/**
 * TypeORM-backed adapter for the `AnswerSheet` aggregate.
 *
 * Save policy: replace-all in a single transaction. DELETE then INSERT
 * inside a transaction guarantees the persisted state mirrors the
 * aggregate exactly. The `UNIQUE (id_diagnostico, id_afirmacion)` DB
 * constraint provides defense-in-depth against duplicate answers.
 *
 * `id_respuesta` is a bigint GENERATED ALWAYS AS IDENTITY — never set
 * it explicitly. `id_afirmacion` is also a bigint (from
 * `irl_catalog.afirmacion`), represented as a string in TypeORM.
 */
@Injectable()
export class TypeOrmAnswerSheetRepository implements AnswerSheetRepositoryPort {
  constructor(
    @InjectRepository(RespuestaOrm)
    private readonly orm: Repository<RespuestaOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<AnswerSheet | null> {
    const rows = await this.orm.find({
      where: { idDiagnostico: diagnosticId },
      order: { idAfirmacion: 'ASC' },
    });
    if (rows.length === 0) return null;

    return AnswerSheet.fromPersistence(
      Uuid.create(diagnosticId),
      rows.map((r) => ({
        statementId: r.idAfirmacion,
        value: r.valorLikert,
      })),
    );
  }

  async save(sheet: AnswerSheet): Promise<void> {
    const snapshot = sheet.toPersistence();

    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(RespuestaOrm, {
        idDiagnostico: sheet.diagnosticId.value,
      });
      if (snapshot.length > 0) {
        const rows = snapshot.map((a) =>
          manager.create(RespuestaOrm, {
            idDiagnostico: sheet.diagnosticId.value,
            idAfirmacion: a.statementId,
            valorLikert: a.value,
          }),
        );
        await manager.insert(RespuestaOrm, rows);
      }
    });
  }
}

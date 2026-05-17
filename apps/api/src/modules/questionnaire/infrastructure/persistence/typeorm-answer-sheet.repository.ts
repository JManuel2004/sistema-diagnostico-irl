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
 * Save policy: **replace-all in a single transaction.** The aggregate
 * is the unit of consistency — when the use case loads it, mutates
 * some answers, and saves, we want the post-save state to exactly
 * mirror the in-memory aggregate. Replacing is simpler and safer than
 * computing a diff, and the aggregate is small (≤48 rows). The
 * transaction guarantees we never observe a partial sheet.
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
        id: r.idRespuesta,
        statementId: r.idAfirmacion,
        value: r.valorLikert,
      })),
    );
  }

  async save(sheet: AnswerSheet): Promise<void> {
    const snapshot = sheet.toPersistence();
    const rows = snapshot.map((a) =>
      this.orm.create({
        idRespuesta: a.id,
        idDiagnostico: sheet.diagnosticId.value,
        idAfirmacion: a.statementId,
        valorLikert: a.value,
      }),
    );

    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(RespuestaOrm, {
        idDiagnostico: sheet.diagnosticId.value,
      });
      if (rows.length > 0) {
        await manager.insert(RespuestaOrm, rows);
      }
    });
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RespuestaOrm } from './infrastructure/persistence/respuesta.orm-entity.js';
import { TypeOrmAnswerSheetRepository } from './infrastructure/persistence/typeorm-answer-sheet.repository.js';
import { ANSWER_SHEET_REPOSITORY } from './domain/ports/answer-sheet.repository.port.js';
import { QuestionnaireController } from './interfaces/http/questionnaire.controller.js';

/**
 * `QuestionnaireModule` — bounded context that owns the `AnswerSheet`
 * aggregate and the `respuesta` rows.
 *
 * Use cases (`SubmitQuestionnaireUseCase`, `SaveDraftAnswersUseCase`,
 * `GetQuestionnaireProgressUseCase`) are feature work and land with
 * the HU that needs them. They will be added to `providers` here.
 *
 * The repository symbol is exported so the `DiagnosticModule`
 * orchestrator can resolve it when finalising an initial diagnostic.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RespuestaOrm])],
  providers: [
    {
      provide: ANSWER_SHEET_REPOSITORY,
      useClass: TypeOrmAnswerSheetRepository,
    },
  ],
  controllers: [QuestionnaireController],
  exports: [ANSWER_SHEET_REPOSITORY],
})
export class QuestionnaireModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RespuestaOrm } from './infrastructure/persistence/respuesta.orm-entity.js';
import { TypeOrmAnswerSheetRepository } from './infrastructure/persistence/typeorm-answer-sheet.repository.js';
import { ANSWER_SHEET_REPOSITORY } from './domain/ports/answer-sheet.repository.port.js';
import { QuestionnaireController } from './interfaces/http/questionnaire.controller.js';
import { SubmitQuestionnaireUseCase } from './application/submit-questionnaire.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([RespuestaOrm])],
  providers: [
    {
      provide: ANSWER_SHEET_REPOSITORY,
      useClass: TypeOrmAnswerSheetRepository,
    },
    SubmitQuestionnaireUseCase,
  ],
  controllers: [QuestionnaireController],
  exports: [ANSWER_SHEET_REPOSITORY],
})
export class QuestionnaireModule {}

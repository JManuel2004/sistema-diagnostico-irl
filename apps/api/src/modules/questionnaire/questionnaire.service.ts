import { Injectable } from '@nestjs/common';
import {
  validateCompleteness,
  type PartialQuestionnaire,
  type ValidationResult,
} from './domain/questionnaire-validator.js';
import type { ValidateQuestionnaireDto } from './dto/validate-questionnaire.dto.js';

@Injectable()
export class QuestionnaireService {
  validate(dto: ValidateQuestionnaireDto): ValidationResult {
    return validateCompleteness(dto as PartialQuestionnaire);
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service.js';
import { ValidateQuestionnaireDto } from './dto/validate-questionnaire.dto.js';
import type { ValidationResult } from './domain/questionnaire-validator.js';

@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() dto: ValidateQuestionnaireDto): ValidationResult {
    return this.questionnaireService.validate(dto);
  }
}

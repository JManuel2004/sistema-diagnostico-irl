import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * HTTP surface for the IRL catalog (read-only).
 *
 * Routes that arrive with Stage 2 user stories:
 *   - `GET /api/v1/catalogo/cuestionario` (HU-07) — returns the
 *     questionnaire structure: 6 dimensions × 8 statements.
 *   - `GET /api/v1/catalogo/tabla-conversion` (E-04) — SA-06 table.
 *
 * Spanish nouns in the URL per `API-CONVENTIONS.md`; JSON keys are
 * camelCase (see `@innlab/contracts`).
 *
 * The class is intentionally empty at Stage 1: the use cases
 * (`GetQuestionnaireStructureQuery`, `GetConversionTableQuery`) and
 * their wiring are feature work and ship with the HU that requires
 * them.
 */
@ApiTags('catalogo')
@Controller('catalogo')
export class IrlCatalogController {}

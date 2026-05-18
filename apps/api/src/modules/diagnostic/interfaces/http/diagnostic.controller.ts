import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * HTTP surface for the diagnostic orchestrator.
 *
 * Routes that arrive with Stage 2 user stories:
 *   - `POST /api/v1/diagnosticos`        (HU-04) — start a new diagnostic.
 *   - `GET  /api/v1/diagnosticos`        (HU-03) — list the user's own.
 *   - `GET  /api/v1/diagnosticos/:id`    — fetch a single diagnostic.
 *   - `POST /api/v1/diagnosticos/:id/finalizar-inicial` — orchestrates
 *     `Questionnaire` + `MaturityProfile` (out of phase-1 scope).
 *
 * As with the other module controllers, Stage 1 leaves the class empty
 * — routes and use cases land with their HU.
 */
@ApiTags('diagnosticos')
@Controller('diagnosticos')
export class DiagnosticController {}

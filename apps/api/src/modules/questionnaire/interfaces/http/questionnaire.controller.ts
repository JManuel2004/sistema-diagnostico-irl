import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * HTTP surface for the questionnaire (write-side).
 *
 * Routes that arrive with Stage 2 user stories:
 *   - `POST /api/v1/diagnosticos/:id/cuestionario` (HU-10) — submit the
 *     completed 48 answers; runs the completeness check and triggers
 *     the maturity-profile calculation through the diagnostic
 *     orchestrator.
 *   - `PUT /api/v1/diagnosticos/:id/cuestionario/respuestas/:statementId`
 *     (HU-09 optional autosave) — upsert a single answer.
 *   - `GET /api/v1/diagnosticos/:id/cuestionario/progreso` — server-side
 *     progress view (mirrors the frontend Zustand store).
 *
 * Stage 1 leaves the class empty: every route is feature work that
 * lands with its HU. The repository and aggregate are wired up so a
 * Stage-2 contributor can inject `ANSWER_SHEET_REPOSITORY` straight
 * into the new use case without re-doing infrastructure.
 */
@ApiTags('cuestionario')
@Controller('diagnosticos/:id/cuestionario')
export class QuestionnaireController {}

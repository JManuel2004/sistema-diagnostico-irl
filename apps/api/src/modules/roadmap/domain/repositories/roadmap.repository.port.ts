import type { ScalingRoadmap } from '../entities/scaling-roadmap.aggregate.js';

/**
 * Port for the saved roadmap of a diagnostic.
 *
 * One roadmap per diagnostic: `save` replaces the previous one, so accepting
 * the deep analysis again (which recalculates) leaves a single, current
 * result with its own `generatedAt`.
 */
export const ROADMAP_REPOSITORY = Symbol('ROADMAP_REPOSITORY');

export interface RoadmapRepositoryPort {
  save(roadmap: ScalingRoadmap): Promise<void>;
  findByDiagnosticId(diagnosticId: string): Promise<ScalingRoadmap | null>;
}

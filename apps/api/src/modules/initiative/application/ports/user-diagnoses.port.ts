import type { DiagnosticSummary } from '@innlab/contracts';

export const USER_DIAGNOSES = Symbol('USER_DIAGNOSES');

/**
 * The diagnostics a user has run, as summaries. `initiative/` owns the
 * history of an initiative's diagnostics but not the diagnostics
 * themselves: it asks `diagnosis/` through this port and never sees its
 * aggregate.
 */
export interface UserDiagnosesPort {
  listByUser(userId: string): Promise<DiagnosticSummary[]>;
}

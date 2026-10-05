import { IRL_ATTRIBUTION, type DiagnosticReport } from '@innlab/contracts';
import {
  anInitiative,
  aProfile,
  aRecommendation,
  aRoadmap,
  DIAGNOSTIC_ID,
  someAnswers,
} from './report-sections.js';

/** The full AgroConecta report, gathered from the sections of `report-sections`. */
export function aReport(
  overrides: Partial<DiagnosticReport> = {},
): DiagnosticReport {
  return {
    diagnosticId: DIAGNOSTIC_ID,
    frameworkVersion: 'KTH-IRL-1.0',
    completedAt: '2026-01-02T10:00:01.000Z',
    initiative: anInitiative(),
    answers: someAnswers(),
    profile: aProfile(),
    recommendation: aRecommendation(),
    roadmap: aRoadmap(),
    attribution: { ...IRL_ATTRIBUTION },
    ...overrides,
  };
}

import type { QuestionnaireStructure } from '@innlab/contracts';

export const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

/** The questionnaire of 6 dimensions with 8 statements each (ids 1..48). */
export function questionnaireFixture(): QuestionnaireStructure {
  return {
    frameworkVersion: 'KTH-IRL-1.0',
    dimensions: DIMENSION_CODES.map((code, dimIdx) => ({
      code,
      name: `${code} — Nombre`,
      description: `Descripción de ${code}`,
      sequence: dimIdx + 1,
      statements: Array.from({ length: 8 }, (_, i) => ({
        id: String(dimIdx * 8 + i + 1),
        dimensionCode: code,
        sequence: i + 1,
        text: `Afirmación ${i + 1} de ${code}`,
      })),
    })),
  };
}

export const queryKeys = {
  session: {
    /** Context of the authenticated user — `GET /me/context`. */
    context: ['session', 'context'] as const,
  },
  catalog: {
    questionnaire: (frameworkVersion: string) =>
      ['catalog', 'questionnaire', frameworkVersion] as const,
    consentTerms: ['catalog', 'consent-terms'] as const,
    sectors: ['catalog', 'sectors'] as const,
    stages: ['catalog', 'stages'] as const,
  },
  initiative: {
    mine: ['initiative', 'mine'] as const,
  },
  diagnostic: {
    list: ['diagnostic', 'list'] as const,
    detail: (id: string) => ['diagnostic', 'detail', id] as const,
    profile: (id: string) => ['diagnostic', id, 'profile'] as const,
    initiative: (id: string) => ['diagnostic', id, 'initiative'] as const,
    recommendation: (id: string) => ['diagnostic', id, 'recommendation'] as const,
    recommendationTrace: (id: string) => ['diagnostic', id, 'recommendation', 'trace'] as const,
    roadmap: (id: string) => ['diagnostic', id, 'roadmap'] as const,
    report: (id: string) => ['diagnostic', id, 'report'] as const,
  },
} as const;

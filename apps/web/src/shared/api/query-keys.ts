export const queryKeys = {
  catalog: {
    questionnaire: ['catalog', 'questionnaire'] as const,
    sectors: ['catalog', 'sectors'] as const,
    stages: ['catalog', 'stages'] as const,
  },
  diagnostic: {
    list: ['diagnostic', 'list'] as const,
    detail: (id: string) => ['diagnostic', 'detail', id] as const,
    profile: (id: string) => ['diagnostic', id, 'profile'] as const,
    initiative: (id: string) => ['diagnostic', id, 'initiative'] as const,
    consent: (id: string) => ['diagnostic', id, 'consent'] as const,
    progress: (id: string) => ['diagnostic', id, 'progress'] as const,
    recommendation: (id: string) => ['diagnostic', id, 'recommendation'] as const,
    recommendationTrace: (id: string) =>
      ['diagnostic', id, 'recommendation', 'trace'] as const,
    roadmap: (id: string) => ['diagnostic', id, 'roadmap'] as const,
  },
} as const;

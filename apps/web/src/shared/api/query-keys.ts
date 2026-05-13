export const queryKeys = {
  catalog: {
    questionnaire: ['catalog', 'questionnaire'] as const,
    sectors: ['catalog', 'sectors'] as const,
  },
  diagnostic: {
    list: ['diagnostic', 'list'] as const,
    detail: (id: string) => ['diagnostic', 'detail', id] as const,
    profile: (id: string) => ['diagnostic', id, 'profile'] as const,
    progress: (id: string) => ['diagnostic', id, 'progress'] as const,
  },
} as const;

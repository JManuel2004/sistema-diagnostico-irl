/**
 * The product's URLs, built in one place. Route paths are user-visible and
 * follow the product language; the route table (`app/router/routes.tsx`)
 * declares the same shapes.
 */
export const paths = {
  landing: '/',
  panel: '/panel',
  startDiagnostic: '/diagnosticos/nuevo',
  /** The wizard; without a step it opens the first one still missing. */
  wizard: (diagnosticId: string, step?: string): string =>
    step === undefined
      ? `/diagnosticos/${diagnosticId}/asistente`
      : `/diagnosticos/${diagnosticId}/asistente/${step}`,
  results: (diagnosticId: string): string => `/diagnosticos/${diagnosticId}/resultados`,
  /** The full report; only once the deep analysis is complete. */
  report: (diagnosticId: string): string => `/diagnosticos/${diagnosticId}/reporte`,
  initiative: (diagnosticId: string): string => `/diagnosticos/${diagnosticId}/iniciativa`,
} as const;

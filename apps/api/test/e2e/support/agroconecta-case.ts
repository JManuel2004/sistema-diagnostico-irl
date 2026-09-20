/**
 * The AgroConecta acceptance case for the e2e suites.
 *
 * Eight Likert scores per dimension, in the order of the framework. With the
 * SA-06 conversion table they produce exactly the profile the whole backend
 * is validated against:
 *
 *   TRL  sum 26 → 3.250 → IRL 6      IPRL sum  9 → 1.125 → IRL 1
 *   CRL  sum 19 → 2.375 → IRL 4      TmRL sum 22 → 2.750 → IRL 5
 *   BRL  sum 15 → 1.875 → IRL 3      FRL  sum 13 → 1.625 → IRL 2
 *
 * These are the same 48 scores the web app's development autofill uses
 * (`apps/web/src/dev/agroconecta-case.ts`); only the scores are repeated
 * here, the justification texts live in the web fixture.
 */
export const AGROCONECTA_SCORES: Record<string, readonly number[]> = {
  TRL: [4, 4, 3, 4, 3, 3, 3, 2],
  CRL: [3, 3, 2, 3, 2, 2, 2, 2],
  BRL: [3, 2, 2, 2, 2, 2, 1, 1],
  IPRL: [2, 1, 1, 1, 1, 1, 1, 1],
  TmRL: [4, 3, 3, 3, 3, 2, 2, 2],
  FRL: [2, 2, 2, 2, 2, 1, 1, 1],
};

export const AGROCONECTA_LEVELS = {
  TRL: 6,
  CRL: 4,
  BRL: 3,
  IPRL: 1,
  TmRL: 5,
  FRL: 2,
} as const;

/** The 48 answers of the case, from the statements as the database holds them. */
export function agroconectaAnswers(
  statements: readonly { id_statement: string; code: string; sequence: number }[],
): { statementId: string; value: number; justification: string }[] {
  return statements.map((s) => ({
    statementId: String(s.id_statement),
    value: AGROCONECTA_SCORES[s.code][s.sequence - 1],
    justification: `Justificación de ${s.code} ${String(s.sequence)}`,
  }));
}

/** The initiative profile of the case; `sectorId` and `stageId` come from the catalog. */
export function agroconectaInitiative(ids: { sectorId: string; stageId: string }) {
  return {
    ...ids,
    name: 'AgroConecta — Plataforma digital de trazabilidad y comercialización directa de café',
    productType:
      'Aplicación web (mercado digital) + módulo de trazabilidad de calidad para la cadena de café',
    declaredStage:
      'Piloto completado — buscando validar el modelo comercial y resolver riesgos legales antes de escalar',
    teamSize: 3,
    teamDescription:
      '3 personas — 1 fundadora agrónoma (tiempo completo), 1 coordinadora de operaciones (medio tiempo), 1 desarrollador externo contratado por proyecto',
    targetMarket:
      'Productores de café de pequeña escala y compradores exportadores en el suroccidente colombiano (Cauca y Valle del Cauca)',
    currentFunding: 'Ahorros de la fundadora + un incentivo regional de innovación de COP 25M',
  };
}

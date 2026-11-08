/**
 * The acronyms and technical terms of the 48 statements, each with a short
 * definition in plain words, shown in a tooltip on the word (usability test
 * P03 did not understand «IPR», P05 neither «CI/CD» nor «ciberseguridad»).
 * An acronym that has no meaning on its own also carries its `expansion`,
 * written next to it the first time it appears in a statement.
 *
 * INNLAB asked for them in the usability tests (Q7) and chose to publish them
 * without a further review; their changes go here, not in the statements.
 */
export interface StatementTerm {
  /** What it matches in the statement's text, as a whole word. */
  readonly match: string;
  /** Case matters for acronyms («PI» is not «pi»). */
  readonly caseSensitive?: boolean;
  readonly definition: string;
  /** For an acronym: its words, after it the first time. */
  readonly expansion?: string;
}

export const STATEMENT_TERMS: readonly StatementTerm[] = [
  {
    match: 'IPR',
    caseSensitive: true,
    expansion: 'derechos de propiedad intelectual',
    definition:
      'Derechos de propiedad intelectual (en inglés, Intellectual Property Rights): patentes, marcas, derechos de autor y otros registros sobre lo que la iniciativa creó.',
  },
  { match: 'PI', caseSensitive: true, definition: 'Propiedad intelectual.' },
  {
    match: 'sandbox',
    definition:
      'Un entorno de pruebas aislado, donde la solución se prueba sin afectar a usuarios reales.',
  },
  {
    match: 'versión beta',
    definition: 'Una versión casi terminada que usuarios reales prueban antes del lanzamiento.',
  },
  {
    match: 'entorno operativo real',
    definition:
      'Donde los usuarios finales usan la solución en su trabajo diario, no en una prueba.',
  },
  {
    match: 'producción',
    definition:
      'Donde los usuarios finales usan la solución en su trabajo diario, no en una prueba.',
  },
  {
    match: 'escalable',
    definition: 'Que puede atender a muchos más usuarios sin tener que rehacerse.',
  },
  {
    match: 'arquitectura de software',
    definition: 'Cómo está organizada la solución por dentro: sus partes y cómo se conectan.',
  },
  {
    match: 'ciberseguridad',
    definition: 'Las medidas que protegen la solución y sus datos de accesos o ataques.',
  },
  {
    match: 'OWASP',
    caseSensitive: true,
    definition:
      'Una organización que publica guías reconocidas de seguridad para aplicaciones web.',
  },
  {
    match: 'prueba de penetración',
    definition: 'Un ataque simulado, hecho por especialistas, para encontrar fallas de seguridad.',
  },
  {
    match: 'CI/CD',
    caseSensitive: true,
    expansion: 'integración y despliegue continuos',
    definition:
      'Integración y despliegue continuos: cada cambio en el código se prueba y se publica de forma automática.',
  },
  {
    match: 'métricas de desempeño',
    definition: 'Datos de qué tan rápido y estable funciona la solución mientras se usa.',
  },
  {
    match: 'problem-solution fit',
    definition: 'Evidencia de que la solución sí resuelve el problema que tienen los clientes.',
  },
  {
    match: 'NPS',
    caseSensitive: true,
    expansion: 'índice de recomendación',
    definition:
      'Net Promoter Score: una medida de qué tanto recomendarían los clientes la solución.',
  },
  {
    match: 'CRM',
    caseSensitive: true,
    expansion: 'gestión de clientes',
    definition: 'Una herramienta para registrar y dar seguimiento a los clientes y las ventas.',
  },
  {
    match: 'retención',
    definition: 'Qué proporción de clientes sigue usando o comprando la solución con el tiempo.',
  },
  {
    match: 'TAM/SAM',
    caseSensitive: true,
    expansion: 'mercado total y mercado alcanzable',
    definition:
      'El tamaño del mercado total (TAM) y de la parte de ese mercado a la que la iniciativa puede llegar (SAM).',
  },
  {
    match: 'P&L',
    caseSensitive: true,
    expansion: 'estado de pérdidas y ganancias',
    definition:
      'Estado de pérdidas y ganancias: los ingresos, los costos y el resultado esperados.',
  },
  {
    match: 'preventa',
    definition: 'Vender la solución a clientes reales antes de su lanzamiento completo.',
  },
  { match: 'champion', definition: 'La persona que lidera la iniciativa y la impulsa.' },
  {
    match: 'equity',
    definition: 'Cómo se reparte la propiedad de la iniciativa entre sus miembros.',
  },
  {
    match: 'CEO',
    caseSensitive: true,
    expansion: 'director general',
    definition: 'La persona que dirige la organización.',
  },
  {
    match: 'junta directiva',
    definition: 'Un grupo de personas que asesora y supervisa a quienes dirigen.',
  },
  {
    match: 'RRHH',
    caseSensitive: true,
    expansion: 'recursos humanos',
    definition: 'Recursos humanos: la contratación, las políticas y el desarrollo del personal.',
  },
  { match: 'pitch', definition: 'Una presentación corta para convencer a inversionistas.' },
  { match: 'funding', definition: 'Financiación.' },
  {
    match: 'due diligence',
    definition: 'La revisión detallada que hace un inversionista antes de invertir.',
  },
];

/** A piece of a statement: plain text, or a term with its definition. */
export type StatementSegment =
  | { readonly kind: 'text'; readonly text: string }
  | {
      readonly kind: 'term';
      readonly text: string;
      readonly definition: string;
      /** Written after it, unless the statement already explains it in parentheses. */
      readonly expansion?: string;
    };

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * Splits a statement into its text and its terms. Each term is marked once,
 * where it first appears, as a whole word (neither «PI» inside «PIB» nor
 * «pitch» inside another word). An acronym the statement already explains in
 * parentheses («CI/CD (integración…)»), or one that is itself between
 * parentheses («(P&L)»), gets no expansion; the parenthesis that glosses a
 * marked term is not marked again.
 */
export function segmentStatement(
  text: string,
  terms: readonly StatementTerm[] = STATEMENT_TERMS,
): StatementSegment[] {
  const found: { start: number; end: number; term: StatementTerm }[] = [];
  for (const term of terms) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escape(term.match)}(?![\\p{L}\\p{N}])`,
      term.caseSensitive ? 'u' : 'iu',
    );
    const match = pattern.exec(text);
    if (match) found.push({ start: match.index, end: match.index + match[0].length, term });
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: StatementSegment[] = [];
  let cursor = 0;
  let previousEnd = -1;
  for (const { start, end, term } of found) {
    if (start < cursor) continue; // Inside a longer term already marked.
    // «entorno operativo real (producción)»: the gloss of a marked term is not marked again.
    if (previousEnd >= 0 && /^\s*\($/.test(text.slice(previousEnd, start))) continue;
    if (start > cursor) segments.push({ kind: 'text', text: text.slice(cursor, start) });
    // Already explained after it, or itself inside parentheses: no expansion.
    const explained = /^\s*\(/.test(text.slice(end)) || /\(\s*$/.test(text.slice(0, start));
    segments.push({
      kind: 'term',
      text: text.slice(start, end),
      definition: term.definition,
      ...(term.expansion && !explained ? { expansion: term.expansion } : {}),
    });
    cursor = end;
    previousEnd = end;
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) });
  return segments;
}

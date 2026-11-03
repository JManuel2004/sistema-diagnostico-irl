/**
 * Six IRL dimensions of the KTH Innovation Readiness Level framework.
 *
 * The codes, names, and order are non-negotiable domain facts (see
 * the project's domain-model conventions, PROJECT-SUMMARY.md §1.2). The descriptions are
 * authored from the public KTH framework documentation and written in the
 * user's words, not in technical terms (client validation: the TRL is told
 * against a real productive environment, not «producción»); if the project
 * stakeholders provide canonical Spanish text, replace these strings
 * but never change the codes or order.
 *
 * NOTE: `id_dimension` is GENERATED ALWAYS AS IDENTITY — do not include
 * it in INSERT statements. The DB assigns the PK automatically.
 */
export interface DimensionSeed {
  readonly code: 'TRL' | 'CRL' | 'BRL' | 'IPRL' | 'TmRL' | 'FRL';
  readonly nameEs: string;
  /** Short label for compact UI; the backend serves it, the frontend keeps no copy. */
  readonly shortNameEs: string;
  readonly description: string;
  /**
   * RF-13: only CRL, BRL and TmRL can be in a critical state; TRL, IPRL and
   * FRL never receive that alert, whatever their level. This flag is what
   * says which dimensions those are, and `MaturityProfile.criticalState()`
   * reads it.
   */
  readonly isCriticalDimension: boolean;
  readonly sequence: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * IRL level the dimension is expected to reach for the initiative to
   * be considered balanced. Consumed by the scaling roadmap: a
   * dimension below its minimum enters the intervention focus set.
   *
   * ⚠ The uniform value of 4 is a placeholder pending validation by
   * INNLAB. The schema allows a different minimum per dimension; that
   * they currently coincide should not be read as the system assuming
   * a single global minimum.
   */
  readonly minimumExpectedLevel: number;
}

export const DIMENSIONS: readonly DimensionSeed[] = [
  {
    code: 'TRL',
    nameEs: 'Nivel de Madurez Tecnológica',
    shortNameEs: 'Tecnología',
    description:
      'Qué tan probada y lista está la solución para usarse en un entorno productivo real.',
    isCriticalDimension: false,
    sequence: 1,
    minimumExpectedLevel: 4,
  },
  {
    code: 'CRL',
    nameEs: 'Nivel de Madurez del Cliente',
    shortNameEs: 'Cliente',
    description:
      'Qué tanto conoces a tus clientes: si su necesidad está confirmada, quiénes son y si están dispuestos a usar o comprar la solución.',
    isCriticalDimension: true,
    sequence: 2,
    minimumExpectedLevel: 4,
  },
  {
    code: 'BRL',
    nameEs: 'Nivel de Madurez del Modelo de Negocio',
    shortNameEs: 'Negocio',
    description:
      'Qué tan claro está cómo la iniciativa crea valor para sus clientes, de dónde vienen sus ingresos, cuánto le cuesta operar y si es viable.',
    isCriticalDimension: true,
    sequence: 3,
    minimumExpectedLevel: 4,
  },
  {
    code: 'IPRL',
    nameEs: 'Nivel de Madurez de la Propiedad Intelectual',
    shortNameEs: 'Propiedad Intelectual',
    description:
      'Qué tan identificadas y protegidas están las ideas, la tecnología y la marca de la iniciativa, y si puede usarlas sin chocar con derechos de otros.',
    isCriticalDimension: false,
    sequence: 4,
    minimumExpectedLevel: 4,
  },
  {
    code: 'TmRL',
    nameEs: 'Nivel de Madurez del Equipo',
    shortNameEs: 'Equipo',
    description:
      'Qué tan completo es el equipo que impulsa la iniciativa: si sus capacidades se complementan y cuánto tiempo le dedican las personas clave.',
    isCriticalDimension: true,
    sequence: 5,
    minimumExpectedLevel: 4,
  },
  {
    code: 'FRL',
    nameEs: 'Nivel de Madurez de la Financiación',
    shortNameEs: 'Financiación',
    description:
      'Con qué recursos cuenta la iniciativa, para cuánto tiempo le alcanzan y qué tan claro es su plan para conseguir los que le faltan.',
    isCriticalDimension: false,
    sequence: 6,
    minimumExpectedLevel: 4,
  },
];

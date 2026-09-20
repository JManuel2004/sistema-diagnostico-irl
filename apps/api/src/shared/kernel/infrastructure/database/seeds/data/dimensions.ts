/**
 * Six IRL dimensions of the KTH Innovation Readiness Level framework.
 *
 * The codes, names, and order are non-negotiable domain facts (see
 * the project's domain-model conventions, PROJECT-SUMMARY.md §1.2). The descriptions are
 * authored from the public KTH framework documentation; if the project
 * stakeholders provide canonical Spanish text, replace these strings
 * but never change the codes or order.
 *
 * NOTE: `id_dimension` is GENERATED ALWAYS AS IDENTITY — do not include
 * it in INSERT statements. The DB assigns the PK automatically.
 */
export interface DimensionSeed {
  readonly code: 'TRL' | 'CRL' | 'BRL' | 'IPRL' | 'TmRL' | 'FRL';
  readonly nameEs: string;
  readonly nameEn: string;
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
    nameEn: 'Technology Readiness Level',
    shortNameEs: 'Tecnología',
    description:
      'Madurez tecnológica: qué tan probada y lista para producción está la solución técnica de la iniciativa.',
    isCriticalDimension: false,
    sequence: 1,
    minimumExpectedLevel: 4,
  },
  {
    code: 'CRL',
    nameEs: 'Nivel de Madurez del Cliente',
    nameEn: 'Customer Readiness Level',
    shortNameEs: 'Cliente',
    description:
      'Madurez del entendimiento del cliente y del mercado: validación de la necesidad, segmentación y disposición a adoptar.',
    isCriticalDimension: true,
    sequence: 2,
    minimumExpectedLevel: 4,
  },
  {
    code: 'BRL',
    nameEs: 'Nivel de Madurez del Modelo de Negocio',
    nameEn: 'Business Model Readiness Level',
    shortNameEs: 'Negocio',
    description:
      'Madurez del modelo de negocio: propuesta de valor, fuentes de ingresos, estructura de costos y viabilidad económica.',
    isCriticalDimension: true,
    sequence: 3,
    minimumExpectedLevel: 4,
  },
  {
    code: 'IPRL',
    nameEs: 'Nivel de Madurez de la Propiedad Intelectual',
    nameEn: 'Intellectual Property Readiness Level',
    shortNameEs: 'Propiedad Intelectual',
    description:
      'Madurez de la propiedad intelectual: identificación, protección y libertad de operación de los activos intangibles.',
    isCriticalDimension: false,
    sequence: 4,
    minimumExpectedLevel: 4,
  },
  {
    code: 'TmRL',
    nameEs: 'Nivel de Madurez del Equipo',
    nameEn: 'Team Readiness Level',
    shortNameEs: 'Equipo',
    description:
      'Madurez del equipo: composición, complementariedad de competencias y dedicación de los miembros clave.',
    isCriticalDimension: true,
    sequence: 5,
    minimumExpectedLevel: 4,
  },
  {
    code: 'FRL',
    nameEs: 'Nivel de Madurez de la Financiación',
    nameEn: 'Funding Readiness Level',
    shortNameEs: 'Financiación',
    description:
      'Madurez de la financiación: fuentes de capital aseguradas, runway y plan financiero para alcanzar los siguientes hitos.',
    isCriticalDimension: false,
    sequence: 6,
    minimumExpectedLevel: 4,
  },
];

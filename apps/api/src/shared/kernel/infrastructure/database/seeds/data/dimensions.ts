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
  readonly description: string;
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
    description:
      'Madurez del entendimiento del cliente y del mercado: validación de la necesidad, segmentación y disposición a adoptar.',
    isCriticalDimension: false,
    sequence: 2,
    minimumExpectedLevel: 4,
  },
  {
    code: 'BRL',
    nameEs: 'Nivel de Madurez del Modelo de Negocio',
    nameEn: 'Business Model Readiness Level',
    description:
      'Madurez del modelo de negocio: propuesta de valor, fuentes de ingresos, estructura de costos y viabilidad económica.',
    isCriticalDimension: false,
    sequence: 3,
    minimumExpectedLevel: 4,
  },
  {
    code: 'IPRL',
    nameEs: 'Nivel de Madurez de la Propiedad Intelectual',
    nameEn: 'Intellectual Property Readiness Level',
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
    description:
      'Madurez del equipo: composición, complementariedad de competencias y dedicación de los miembros clave.',
    isCriticalDimension: false,
    sequence: 5,
    minimumExpectedLevel: 4,
  },
  {
    code: 'FRL',
    nameEs: 'Nivel de Madurez de la Financiación',
    nameEn: 'Funding Readiness Level',
    description:
      'Madurez de la financiación: fuentes de capital aseguradas, runway y plan financiero para alcanzar los siguientes hitos.',
    isCriticalDimension: false,
    sequence: 6,
    minimumExpectedLevel: 4,
  },
];

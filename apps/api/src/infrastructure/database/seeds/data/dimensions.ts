/**
 * Six IRL dimensions of the KTH Innovation Readiness Level framework.
 *
 * The codes, names, and order are non-negotiable domain facts (see
 * `CLAUDE.md` and PROJECT-SUMMARY.md §1.2). The descriptions are
 * authored from the public KTH framework documentation; if the project
 * stakeholders provide canonical Spanish text, replace these strings
 * but never change the codes or order.
 *
 * NOTE: `id_dimension` is GENERATED ALWAYS AS IDENTITY — do not include
 * it in INSERT statements. The DB assigns the PK automatically.
 */
export interface DimensionSeed {
  readonly codigo: 'TRL' | 'CRL' | 'BRL' | 'IPRL' | 'TmRL' | 'FRL';
  readonly nombreEs: string;
  readonly nombreEn: string;
  readonly descripcion: string;
  readonly esDimensionCritica: boolean;
  readonly orden: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Nivel IRL que se espera que la dimensión alcance para considerar
   * equilibrada la iniciativa. Lo consume el roadmap de escalamiento:
   * una dimensión por debajo de su mínimo entra al foco de intervención.
   *
   * ⚠ El 4 uniforme es un valor hipotético pendiente de validación por
   * INNLAB. El esquema admite un mínimo distinto por dimensión; que hoy
   * coincidan no debe leerse como que el sistema asume uno global.
   */
  readonly nivelMinimoEsperado: number;
}

export const DIMENSIONS: readonly DimensionSeed[] = [
  {
    codigo: 'TRL',
    nombreEs: 'Nivel de Madurez Tecnológica',
    nombreEn: 'Technology Readiness Level',
    descripcion:
      'Madurez tecnológica: qué tan probada y lista para producción está la solución técnica de la iniciativa.',
    esDimensionCritica: false,
    orden: 1,
    nivelMinimoEsperado: 4,
  },
  {
    codigo: 'CRL',
    nombreEs: 'Nivel de Madurez del Cliente',
    nombreEn: 'Customer Readiness Level',
    descripcion:
      'Madurez del entendimiento del cliente y del mercado: validación de la necesidad, segmentación y disposición a adoptar.',
    esDimensionCritica: false,
    orden: 2,
    nivelMinimoEsperado: 4,
  },
  {
    codigo: 'BRL',
    nombreEs: 'Nivel de Madurez del Modelo de Negocio',
    nombreEn: 'Business Model Readiness Level',
    descripcion:
      'Madurez del modelo de negocio: propuesta de valor, fuentes de ingresos, estructura de costos y viabilidad económica.',
    esDimensionCritica: false,
    orden: 3,
    nivelMinimoEsperado: 4,
  },
  {
    codigo: 'IPRL',
    nombreEs: 'Nivel de Madurez de la Propiedad Intelectual',
    nombreEn: 'Intellectual Property Readiness Level',
    descripcion:
      'Madurez de la propiedad intelectual: identificación, protección y libertad de operación de los activos intangibles.',
    esDimensionCritica: false,
    orden: 4,
    nivelMinimoEsperado: 4,
  },
  {
    codigo: 'TmRL',
    nombreEs: 'Nivel de Madurez del Equipo',
    nombreEn: 'Team Readiness Level',
    descripcion:
      'Madurez del equipo: composición, complementariedad de competencias y dedicación de los miembros clave.',
    esDimensionCritica: false,
    orden: 5,
    nivelMinimoEsperado: 4,
  },
  {
    codigo: 'FRL',
    nombreEs: 'Nivel de Madurez de la Financiación',
    nombreEn: 'Funding Readiness Level',
    descripcion:
      'Madurez de la financiación: fuentes de capital aseguradas, runway y plan financiero para alcanzar los siguientes hitos.',
    esDimensionCritica: false,
    orden: 6,
    nivelMinimoEsperado: 4,
  },
];

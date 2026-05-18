/**
 * Six IRL dimensions of the KTH Innovation Readiness Level framework.
 *
 * The codes, names, and order are non-negotiable domain facts (see
 * `CLAUDE.md` and PROJECT-SUMMARY.md §1.2). The descriptions are
 * authored from the public KTH framework documentation; if the project
 * stakeholders provide canonical Spanish text, replace these strings
 * but never change the codes or order.
 */
export interface DimensionSeed {
  readonly id: string;
  readonly codigo: 'TRL' | 'CRL' | 'BRL' | 'IPRL' | 'TmRL' | 'FRL';
  readonly nombre: string;
  readonly descripcion: string;
  readonly orden: 1 | 2 | 3 | 4 | 5 | 6;
}

export const DIMENSIONS: readonly DimensionSeed[] = [
  {
    id: '11111111-1111-1111-1111-000000000001',
    codigo: 'TRL',
    nombre: 'Technology Readiness Level',
    descripcion:
      'Madurez tecnológica: qué tan probada y lista para producción está la solución técnica de la iniciativa.',
    orden: 1,
  },
  {
    id: '11111111-1111-1111-1111-000000000002',
    codigo: 'CRL',
    nombre: 'Customer Readiness Level',
    descripcion:
      'Madurez del entendimiento del cliente y del mercado: validación de la necesidad, segmentación y disposición a adoptar.',
    orden: 2,
  },
  {
    id: '11111111-1111-1111-1111-000000000003',
    codigo: 'BRL',
    nombre: 'Business Model Readiness Level',
    descripcion:
      'Madurez del modelo de negocio: propuesta de valor, fuentes de ingresos, estructura de costos y viabilidad económica.',
    orden: 3,
  },
  {
    id: '11111111-1111-1111-1111-000000000004',
    codigo: 'IPRL',
    nombre: 'Intellectual Property Readiness Level',
    descripcion:
      'Madurez de la propiedad intelectual: identificación, protección y libertad de operación de los activos intangibles.',
    orden: 4,
  },
  {
    id: '11111111-1111-1111-1111-000000000005',
    codigo: 'TmRL',
    nombre: 'Team Readiness Level',
    descripcion:
      'Madurez del equipo: composición, complementariedad de competencias y dedicación de los miembros clave.',
    orden: 5,
  },
  {
    id: '11111111-1111-1111-1111-000000000006',
    codigo: 'FRL',
    nombre: 'Funding Readiness Level',
    descripcion:
      'Madurez de la financiación: fuentes de capital aseguradas, runway y plan financiero para alcanzar los siguientes hitos.',
    orden: 6,
  },
];

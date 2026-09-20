import type { Initiative } from '@innlab/contracts';

export const SECTORS = [
  { id: '1', name: 'Agroindustria / AgriTech' },
  { id: '2', name: 'Salud' },
];

export const STAGES = [
  { id: '1', code: 'idea', name: 'Idea' },
  { id: '2', code: 'validacion', name: 'Validación' },
  { id: '3', code: 'crecimiento', name: 'Crecimiento' },
];

export function initiativeFixture(over: Partial<Initiative> = {}): Initiative {
  return {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'AgroConecta',
    sector: SECTORS[0],
    productType: 'Aplicación web y módulo de trazabilidad',
    stage: STAGES[1],
    declaredStage: 'Piloto completado',
    teamSize: 3,
    teamDescription: 'Fundadora, coordinadora y desarrollador externo',
    targetMarket: 'Productores de café del suroccidente',
    currentFunding: 'Ahorros de la fundadora',
    ...over,
  };
}

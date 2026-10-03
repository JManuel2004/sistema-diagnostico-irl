import type { ServiceDetail } from '@innlab/contracts';

/** The card of a portfolio service, as the backend serves it (mirrors the seed). */
const CARDS: Record<string, Omit<ServiceDetail, 'idService' | 'name'>> = {
  'Reto Express': {
    subtitle: 'Hackatón · Design Sprint · Challenge',
    description:
      'Tu organización plantea un reto y equipos de estudiantes lo atacan en formato intensivo.',
    scope:
      'Banco de ideas, conceptos y prototipos tempranos (TRL 3–5) + informe síntesis del sprint.',
    band: { minLevel: 3, maxLevel: 5 },
    tier: {
      code: 'descubre',
      name: 'Descubre',
      order: 1,
      tagline: 'Conócenos jugando',
      description: 'Formatos cortos y de baja inversión para encender la relación.',
    },
  },
  'Academia a la Medida': {
    subtitle: 'Formación empresarial — cursos, seminarios, diplomados y maestrías exclusivas',
    description: 'Sistemas modulares de aprendizaje basado en proyectos para tu organización.',
    scope: 'Apropiación de conceptos y proyectos internos desarrollados durante la formación.',
    band: null,
    tier: {
      code: 'descubre',
      name: 'Descubre',
      order: 1,
      tagline: 'Conócenos jugando',
      description: 'Formatos cortos y de baja inversión para encender la relación.',
    },
  },
  'Reto en el Aula': {
    subtitle: 'Proyectos académicos integradores (pregrado y posgrado)',
    description: 'Tu reto entra como proyecto oficial de una materia.',
    scope: 'Banco de ideas y prototipos con madurez TRL 4–6, presentados ante tu equipo.',
    band: { minLevel: 4, maxLevel: 6 },
    tier: {
      code: 'co-crea',
      name: 'Co-crea',
      order: 2,
      tagline: 'Tu reto entra al aula',
      description: 'Tu organización lleva retos reales a cursos y semilleros.',
    },
  },
  'Semillero con Propósito': {
    subtitle: 'Co.seeds — semilleros de innovación',
    description: 'Estudiantes de semilleros trabajan tu reto en paralelo a sus estudios.',
    scope: 'Prototipos avanzados y pruebas con usuarios (TRL 6–7), con entregas periódicas.',
    band: { minLevel: 6, maxLevel: 7 },
    tier: {
      code: 'co-crea',
      name: 'Co-crea',
      order: 2,
      tagline: 'Tu reto entra al aula',
      description: 'Tu organización lleva retos reales a cursos y semilleros.',
    },
  },
  'Consultoría Experta': {
    subtitle: 'Consultoría colaborativa',
    description: 'Trabajo directo de los profesionales de la Universidad.',
    scope: 'Desarrollo profesional listo para el mercado (TRL 7–9).',
    band: { minLevel: 7, maxLevel: 9 },
    tier: {
      code: 'aliate',
      name: 'Alíate',
      order: 4,
      tagline: 'Vivamos juntos la innovación',
      description: 'Relaciones de largo plazo.',
    },
  },
};

export function serviceDetailFixture(idService: number, name: string): ServiceDetail {
  const card = CARDS[name] ?? CARDS['Reto Express'];
  return { idService, name, ...card };
}

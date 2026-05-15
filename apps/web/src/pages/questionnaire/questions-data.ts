import type { Dimension, QuestionKey } from '@innlab/contracts';

export interface DimensionMeta {
  label: string;
  fullName: string;
  color: string;
  description: string;
}

export const DIMENSION_META: Record<Dimension, DimensionMeta> = {
  trl: {
    label: 'TRL',
    fullName: 'Technology Readiness Level',
    color: 'var(--color-trl)',
    description: 'Nivel de madurez tecnológica',
  },
  crl: {
    label: 'CRL',
    fullName: 'Customer Readiness Level',
    color: 'var(--color-crl)',
    description: 'Nivel de madurez en clientes',
  },
  brl: {
    label: 'BRL',
    fullName: 'Business Readiness Level',
    color: 'var(--color-brl)',
    description: 'Nivel de madurez del negocio',
  },
  iprl: {
    label: 'IPRL',
    fullName: 'Intellectual Property Readiness Level',
    color: 'var(--color-iprl)',
    description: 'Nivel de madurez en propiedad intelectual',
  },
  tmrl: {
    label: 'TmRL',
    fullName: 'Team Readiness Level',
    color: 'var(--color-tmrl)',
    description: 'Nivel de madurez del equipo',
  },
  frl: {
    label: 'FRL',
    fullName: 'Funding Readiness Level',
    color: 'var(--color-frl)',
    description: 'Nivel de madurez en financiamiento',
  },
};

export const QUESTIONS: Record<Dimension, Record<QuestionKey, string>> = {
  trl: {
    q1: 'El principio científico básico de la solución tecnológica ha sido observado y documentado.',
    q2: 'El concepto tecnológico y sus aplicaciones potenciales han sido formulados con claridad.',
    q3: 'Se ha validado experimentalmente una prueba de concepto de la tecnología.',
    q4: 'Los componentes básicos de la tecnología han sido validados en condiciones de laboratorio.',
    q5: 'Los componentes de la tecnología han sido validados en un entorno relevante al contexto real.',
    q6: 'El prototipo del sistema ha sido demostrado en un entorno relevante con resultados satisfactorios.',
    q7: 'El prototipo del sistema ha sido demostrado en un entorno operacional real.',
    q8: 'El sistema está completo, calificado y validado mediante pruebas y demostraciones exhaustivas.',
  },
  crl: {
    q1: 'Hemos identificado y caracterizado con precisión el segmento de clientes objetivo para la solución.',
    q2: 'Hemos realizado investigación con clientes potenciales para comprender sus problemas y necesidades.',
    q3: 'Hemos validado que el problema que resolvemos es relevante y prioritario para los clientes.',
    q4: 'Hemos obtenido evidencia concreta de disposición de pago de clientes potenciales por la solución.',
    q5: 'Hemos realizado pilotos o demostraciones de la solución con clientes reales en su entorno.',
    q6: 'Tenemos clientes que han adoptado la solución y la utilizan de forma continua y regular.',
    q7: 'Contamos con contratos o acuerdos formales de compra firmados con clientes.',
    q8: 'Disponemos de métricas de satisfacción del cliente que confirman el valor entregado.',
  },
  brl: {
    q1: 'Hemos definido una propuesta de valor clara y diferenciada para nuestra iniciativa.',
    q2: 'Hemos mapeado el ecosistema de actores relevantes: competidores, aliados y reguladores.',
    q3: 'Contamos con un modelo de negocio documentado con fuentes de ingresos identificadas.',
    q4: 'Hemos validado la viabilidad financiera del modelo de negocio con datos reales o proyecciones fundamentadas.',
    q5: 'Tenemos una estrategia de acceso al mercado (go-to-market) definida y en ejecución.',
    q6: 'Hemos establecido alianzas o acuerdos comerciales estratégicos con actores clave del ecosistema.',
    q7: 'La iniciativa genera o proyecta indicadores financieros positivos y sostenibles.',
    q8: 'Contamos con un plan de escalabilidad viable para crecer en el mercado objetivo.',
  },
  iprl: {
    q1: 'Hemos identificado los activos de propiedad intelectual (PI) clave generados por la iniciativa.',
    q2: 'Hemos analizado qué elementos de la solución son protegibles legalmente.',
    q3: 'Realizamos una búsqueda de libertad de operación (freedom-to-operate) en el mercado objetivo.',
    q4: 'Hemos iniciado procesos formales de protección de propiedad intelectual ante las autoridades competentes.',
    q5: 'Contamos con acuerdos de confidencialidad firmados con todos los colaboradores y socios del proyecto.',
    q6: 'La titularidad de la propiedad intelectual está claramente definida y asignada entre los miembros del equipo.',
    q7: 'La iniciativa cuenta con registros formales de PI: patentes, marcas, derechos de autor u otros.',
    q8: 'La estrategia de PI está alineada con el modelo de negocio y contribuye a la ventaja competitiva.',
  },
  tmrl: {
    q1: 'El equipo cuenta con las competencias técnicas necesarias para desarrollar la solución propuesta.',
    q2: 'El equipo tiene experiencia previa relevante en el sector o mercado objetivo de la iniciativa.',
    q3: 'Los roles y responsabilidades están claramente definidos y asumidos por cada miembro del equipo.',
    q4: 'El equipo ha trabajado junto previamente o tiene experiencia colaborativa comprobable.',
    q5: 'El equipo cuenta con procesos claros y acordados para la toma de decisiones colectivas.',
    q6: 'El equipo identifica activamente sus brechas de talento y trabaja de forma deliberada para cerrarlas.',
    q7: 'El equipo cuenta con asesores o mentores externos con experiencia clave en áreas estratégicas.',
    q8: 'El equipo demuestra capacidad para adaptarse y pivotar frente a cambios del entorno o del mercado.',
  },
  frl: {
    q1: 'Hemos estimado con rigor los recursos financieros necesarios para desarrollar la iniciativa.',
    q2: 'Hemos identificado las fuentes de financiamiento disponibles y adecuadas para nuestra etapa actual.',
    q3: 'La iniciativa ha accedido a financiamiento inicial (autofinanciamiento, amigos, familia u otros).',
    q4: 'Hemos presentado formalmente la iniciativa ante potenciales inversores o entidades de financiamiento.',
    q5: 'Hemos obtenido financiamiento formal de fuentes externas: ángeles inversionistas, fondos o subsidios.',
    q6: 'La iniciativa cuenta con un runway financiero definido y suficiente para alcanzar el próximo hito clave.',
    q7: 'Tenemos un historial documentado de uso eficiente de los recursos financieros obtenidos.',
    q8: 'La iniciativa está en camino demostrable de ser financieramente sostenible o autosuficiente.',
  },
};

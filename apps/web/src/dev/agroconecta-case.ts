import type { DimensionCode } from '@innlab/contracts';

/**
 * AgroConecta — the fictitious acceptance case of the project.
 *
 * Development-only data: it is imported through `dev-autofill.ts`, which only
 * loads it when `VITE_DEV_AUTOFILL` is `true` at build time (see
 * `.env.development`), so it is not part of a production bundle.
 *
 * The 48 answers are in the order of the framework (eight per dimension).
 * With the SA-06 conversion table they give exactly TRL 6, CRL 4, BRL 3,
 * IPRL 1, TmRL 5, FRL 2 — the same case the backend e2e suites validate
 * (`apps/api/test/e2e/support/agroconecta-case.ts` repeats only the scores).
 */
export interface AgroconectaAnswer {
  readonly dimension: DimensionCode;
  /** 1..8 inside the dimension. */
  readonly sequence: number;
  readonly score: 1 | 2 | 3 | 4 | 5;
  readonly justification: string;
}

export const AGROCONECTA_INITIATIVE = {
  name: 'AgroConecta',
  sectorName: 'Agroindustria / AgriTech',
  productType:
    'Aplicación web (mercado digital) + módulo de trazabilidad de calidad para la cadena de café',
  declaredStage:
    'Piloto completado — buscando validar el modelo comercial y resolver riesgos legales antes de escalar',
  /** The catalog stage the declared one maps to (`irl_catalog.initiative_stage.code`). */
  stageCode: 'validacion',
  teamSize: 3,
  teamDescription:
    '3 personas — 1 fundadora agrónoma (tiempo completo), 1 coordinadora de operaciones (medio tiempo), 1 desarrollador externo contratado por proyecto',
  targetMarket:
    'Productores de café de pequeña escala y compradores exportadores en el suroccidente colombiano (Cauca y Valle del Cauca)',
  currentFunding: 'Ahorros de la fundadora + un incentivo regional de innovación de COP 25M',
} as const;

export const AGROCONECTA_ANSWERS: readonly AgroconectaAnswer[] = [
  // TRL — suma 26, promedio 3.25
  {
    dimension: 'TRL',
    sequence: 1,
    score: 4,
    justification:
      'La arquitectura general de la plataforma (mercado digital, portal de compradores, seguimiento logístico) está documentada en Notion con diagramas de flujo del proceso.',
  },
  {
    dimension: 'TRL',
    sequence: 2,
    score: 4,
    justification:
      'El módulo de emparejamiento entre productores y compradores fue probado internamente en un entorno de pruebas antes de salir a campo.',
  },
  {
    dimension: 'TRL',
    sequence: 3,
    score: 3,
    justification:
      'Se realizó un piloto de 6 semanas con 12 productores de café en el norte del Cauca; el desempeño fue adecuado pero surgieron dificultades de conectividad en zonas rurales que aún no se han resuelto.',
  },
  {
    dimension: 'TRL',
    sequence: 4,
    score: 4,
    justification:
      'La versión beta opera en producción con 3 compradores exportadores y cerca de 40 productores que la utilizan de forma autónoma, aunque a escala reducida.',
  },
  {
    dimension: 'TRL',
    sequence: 5,
    score: 3,
    justification:
      'La plataforma opera de forma comercial limitada; hacen falta ajustes de escalabilidad y seguridad antes de sostener una operación continua de mayor tamaño.',
  },
  {
    dimension: 'TRL',
    sequence: 6,
    score: 3,
    justification:
      'La arquitectura fue revisada de manera informal por el desarrollador externo que apoya el proyecto, pero no por un especialista independiente certificado.',
  },
  {
    dimension: 'TRL',
    sequence: 7,
    score: 3,
    justification:
      'Se aplicaron prácticas básicas de seguridad recomendadas por el desarrollador, pero no se ha realizado ninguna auditoría o prueba externa formal.',
  },
  {
    dimension: 'TRL',
    sequence: 8,
    score: 2,
    justification:
      'No existe un proceso formal de actualización y despliegue continuo, la documentación técnica es incompleta y no se han definido métricas de desempeño ni acuerdos de servicio.',
  },

  // CRL — suma 19, promedio 2.38
  {
    dimension: 'CRL',
    sequence: 1,
    score: 3,
    justification:
      'Se identificó la falta de trazabilidad y la intermediación excesiva en la cadena de comercialización del café como problema central, con una hipótesis inicial sobre compradores exportadores como segmento principal, aún no confirmada del todo.',
  },
  {
    dimension: 'CRL',
    sequence: 2,
    score: 3,
    justification:
      'Se sostuvieron 10 conversaciones con productores y 4 con compradores exportadores, registradas en notas informales sin una guía estructurada de entrevista.',
  },
  {
    dimension: 'CRL',
    sequence: 3,
    score: 2,
    justification:
      'Solo 2 de los 4 compradores entrevistados confirmaron el problema como una prioridad real para su operación actual; los segmentos prioritarios aún no están del todo definidos.',
  },
  {
    dimension: 'CRL',
    sequence: 4,
    score: 3,
    justification:
      'Tres compradores manifestaron interés informal en probar la funcionalidad de emparejamiento, sin que exista todavía un compromiso formal.',
  },
  {
    dimension: 'CRL',
    sequence: 5,
    score: 2,
    justification:
      'Solo los productores del piloto han usado la plataforma; ningún comprador externo la ha probado de forma independiente y no se han recolectado métricas de satisfacción.',
  },
  {
    dimension: 'CRL',
    sequence: 6,
    score: 2,
    justification:
      'No existen ventas ni acuerdos comerciales formales; el piloto se realizó sin ningún tipo de cobro ni contrato.',
  },
  {
    dimension: 'CRL',
    sequence: 7,
    score: 2,
    justification:
      'No existe una herramienta de gestión comercial ni un flujo de adquisición de usuarios estructurado; la vinculación de nuevos productores se hace de manera informal.',
  },
  {
    dimension: 'CRL',
    sequence: 8,
    score: 2,
    justification:
      'La base de usuarios sigue limitada al grupo del piloto; no hay un proceso de expansión de mercado en marcha ni indicadores de retención medidos.',
  },

  // BRL — suma 15, promedio 1.88
  {
    dimension: 'BRL',
    sequence: 1,
    score: 3,
    justification:
      'Existe un lienzo de modelo de negocio inicial con propuesta de valor y canales descritos, aunque la fuente de ingreso (comisión por transacción frente a suscripción mensual) todavía no está definida con certeza.',
  },
  {
    dimension: 'BRL',
    sequence: 2,
    score: 2,
    justification:
      'El mercado objetivo se describe de forma general (cadena de exportación de café en Cauca y Valle) sin una estimación formal de tamaño ni un mapeo sistemático de competidores.',
  },
  {
    dimension: 'BRL',
    sequence: 3,
    score: 2,
    justification:
      'Existe una hoja de cálculo con proyecciones a tres años, construida enteramente sobre supuestos internos del equipo, sin contraste con datos externos.',
  },
  {
    dimension: 'BRL',
    sequence: 4,
    score: 2,
    justification:
      'No se ha recibido retroalimentación formal de expertos o socios externos sobre la viabilidad del modelo propuesto ni sobre el esquema de precio planteado.',
  },
  {
    dimension: 'BRL',
    sequence: 5,
    score: 2,
    justification:
      'El equipo tiene una intuición informal sobre el aporte social del modelo (comercio más justo para el productor) pero no ha hecho una evaluación estructurada de impacto.',
  },
  {
    dimension: 'BRL',
    sequence: 6,
    score: 2,
    justification:
      'El piloto realizado no incluyó cobro alguno; no existe evidencia comercial real sobre la disposición de pago de los compradores.',
  },
  {
    dimension: 'BRL',
    sequence: 7,
    score: 1,
    justification:
      'No existe ningún ingreso comercial hasta la fecha; el esquema de comisión propuesto no ha sido puesto a prueba con una transacción real.',
  },
  {
    dimension: 'BRL',
    sequence: 8,
    score: 1,
    justification:
      'El modelo de negocio no está en operación; las proyecciones no cuentan con respaldo en datos reales del mercado.',
  },

  // IPRL — suma 9, promedio 1.13
  {
    dimension: 'IPRL',
    sequence: 1,
    score: 2,
    justification:
      "El equipo cuenta con un listado informal e incompleto de posibles activos: el código de la plataforma, el nombre 'AgroConecta' y la base de datos de trazabilidad de calidad, sin un inventario sistemático.",
  },
  {
    dimension: 'IPRL',
    sequence: 2,
    score: 1,
    justification:
      'La titularidad del código fuente de la plataforma no está clara: fue desarrollado por un contratista externo independiente y no existe un acuerdo firmado de cesión de derechos.',
  },
  {
    dimension: 'IPRL',
    sequence: 3,
    score: 1,
    justification:
      'No se ha realizado ninguna evaluación de las opciones de protección disponibles ni se ha buscado asesoría legal especializada en propiedad intelectual.',
  },
  {
    dimension: 'IPRL',
    sequence: 4,
    score: 1,
    justification:
      'No existe ningún borrador de estrategia de propiedad intelectual; el equipo no ha priorizado este tema frente a las urgencias comerciales y técnicas.',
  },
  {
    dimension: 'IPRL',
    sequence: 5,
    score: 1,
    justification:
      'No se ha presentado ninguna solicitud de registro de marca, derechos de autor u otro activo protegible.',
  },
  {
    dimension: 'IPRL',
    sequence: 6,
    score: 1,
    justification:
      'No existe una estrategia de propiedad intelectual formal ni validada por ningún profesional del área.',
  },
  {
    dimension: 'IPRL',
    sequence: 7,
    score: 1,
    justification:
      'Ningún activo de propiedad intelectual ha sido registrado ni concedido hasta la fecha.',
  },
  {
    dimension: 'IPRL',
    sequence: 8,
    score: 1,
    justification:
      'No existe ningún acuerdo formal con el desarrollador externo sobre el uso o cesión de derechos del código; esta situación representa un riesgo legal activo, especialmente ante una conversación en curso con un posible inversionista interesado en la plataforma.',
  },

  // TmRL — suma 22, promedio 2.75
  {
    dimension: 'TmRL',
    sequence: 1,
    score: 4,
    justification:
      'La fundadora, ingeniera agrónoma y excoordinadora de una cooperativa cafetera, es la líder visible del proyecto y se dedica a tiempo completo desde hace 8 meses.',
  },
  {
    dimension: 'TmRL',
    sequence: 2,
    score: 3,
    justification:
      'El equipo actual (fundadora, una coordinadora de operaciones de medio tiempo y un desarrollador externo contratado por proyecto) cubre parte de las competencias necesarias, pero carece de talento técnico interno y de un perfil comercial dedicado.',
  },
  {
    dimension: 'TmRL',
    sequence: 3,
    score: 3,
    justification:
      'Las brechas (desarrollo interno y ventas) están identificadas de manera informal en conversaciones del equipo, pero no existe un plan documentado con plazos concretos para cubrirlas.',
  },
  {
    dimension: 'TmRL',
    sequence: 4,
    score: 3,
    justification:
      'Existe un acuerdo verbal entre la fundadora y la coordinadora de operaciones sobre roles generales, pero no se ha formalizado por escrito ni se ha definido la estructura de participación societaria.',
  },
  {
    dimension: 'TmRL',
    sequence: 5,
    score: 3,
    justification:
      'El equipo es complementario en el aspecto agronómico y operativo, pero aún carece de experiencia técnica y comercial propia; las decisiones se toman de forma conjunta sin un rol de dirección formalmente asignado.',
  },
  {
    dimension: 'TmRL',
    sequence: 6,
    score: 2,
    justification:
      'No existe un plan de crecimiento organizacional a mediano plazo ni se ha iniciado la vinculación de asesores externos o de una junta consultiva.',
  },
  {
    dimension: 'TmRL',
    sequence: 7,
    score: 2,
    justification:
      'No existe junta directiva, ni políticas formales de gestión del talento humano; el equipo opera de manera informal.',
  },
  {
    dimension: 'TmRL',
    sequence: 8,
    score: 2,
    justification:
      'No existen procesos documentados de cultura organizacional, incentivos o aprendizaje continuo; estos temas no han sido abordados aún por el equipo.',
  },

  // FRL — suma 13, promedio 1.63
  {
    dimension: 'FRL',
    sequence: 1,
    score: 2,
    justification:
      'El equipo tiene una idea general de los costos de los próximos meses y conoce de forma superficial algunas opciones (convocatorias públicas, inversionistas ángel) sin un análisis comparativo formal.',
  },
  {
    dimension: 'FRL',
    sequence: 2,
    score: 2,
    justification:
      'No existe un plan documentado con cronograma y fuentes de financiamiento asociadas a cada hito; las actividades se coordinan de manera informal semana a semana.',
  },
  {
    dimension: 'FRL',
    sequence: 3,
    score: 2,
    justification:
      'El financiamiento actual (ahorros de la fundadora y un incentivo regional de innovación de COP 25 millones) cubre solo una parte de las actividades de validación previstas para los próximos meses.',
  },
  {
    dimension: 'FRL',
    sequence: 4,
    score: 2,
    justification:
      'No existe un plan elaborado a 3-12 meses con financiamiento ya comprometido para ejecutarlo.',
  },
  {
    dimension: 'FRL',
    sequence: 5,
    score: 2,
    justification:
      'No se ha preparado un discurso de presentación para inversionistas ni se ha definido una estrategia de financiamiento de mediano plazo.',
  },
  {
    dimension: 'FRL',
    sequence: 6,
    score: 1,
    justification:
      'No se ha probado ningún discurso de presentación ante audiencias externas ni se han iniciado contactos formales con inversionistas o fondos.',
  },
  {
    dimension: 'FRL',
    sequence: 7,
    score: 1,
    justification:
      'No existen conversaciones concretas con inversionistas ni documentación preparada para un proceso de revisión formal.',
  },
  {
    dimension: 'FRL',
    sequence: 8,
    score: 1,
    justification:
      'El margen de operación actual es de apenas 3 meses; no existen ingresos recurrentes ni financiamiento adicional asegurado más allá del incentivo regional recibido.',
  },
];

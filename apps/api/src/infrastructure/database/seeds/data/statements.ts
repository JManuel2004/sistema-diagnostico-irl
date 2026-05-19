import { DIMENSIONS } from './dimensions.js';

/**
 * Forty-eight statements (afirmaciones) of the IRL questionnaire — 8 per
 * dimension, 6 dimensions, total 48 (RF-05).
 *
 * IMPORTANT: the Spanish text below is placeholder representative of
 * the KTH Innovation Readiness Level framework. Before going to
 * production, replace it with the project-stakeholder-approved wording
 * referenced in `sistema-diagnostico-irl-docs/01-requirements/backlog.md`.
 * Replace the text only — never change `numeroenDimension`, the dimension
 * mapping, or the count of 8 per dimension.
 *
 * `id_afirmacion` is GENERATED ALWAYS AS IDENTITY — statements are inserted
 * without an explicit PK; the DB assigns it. Statements are linked to
 * dimensions by `dimensionCodigo` (looked up in a subquery during seed).
 */
export interface StatementSeed {
  readonly dimensionCodigo: string;
  readonly numeroenDimension: number;
  readonly textoEs: string;
}

const TRL_TEXTS: readonly string[] = [
  'Existe una descripción documentada del concepto técnico o producto digital que se desea desarrollar (especificación, prototipo o documentación técnica inicial).',
  'Se ha construido un prototipo funcional del producto/servicio digital y ha sido probado en condiciones de laboratorio o entorno controlado (sandbox).',
  'El producto/servicio digital ha sido probado con usuarios reales en un entorno relevante y los resultados demuestran que cumple con los requisitos de desempeño esperados.',
  'Existe un prototipo completo o versión beta que ha sido validado en un entorno operativo real (producción) por usuarios finales que lo utilizan de forma autónoma.',
  'El producto/servicio digital es escalable, seguro, compatible con la infraestructura del cliente y está en operación comercial continua con mejoras y optimizaciones en curso.',
  'La arquitectura de software está definida, documentada y ha sido revisada por un especialista técnico independiente.',
  'El sistema cuenta con controles de ciberseguridad implementados (basados en estándares como OWASP) y ha pasado al menos auditoría o prueba de penetración.',
  'Existen procesos de CI/CD (integración y despliegue continuo), documentación técnica completa y métricas de desempeño del sistema en producción.',
];

const CRL_TEXTS: readonly string[] = [
  'Hemos identificado una necesidad o problema específico en el mercado y contamos con una primera hipótesis sobre quiénes podrían ser nuestros clientes o usuarios.',
  'Hemos realizado investigación de mercado primaria (entrevistas, encuestas o contacto directo) con al menos 5 clientes o usuarios potenciales y hemos recibido retroalimentación directa.',
  'Múltiples clientes/usuarios han confirmado que el problema/necesidad identificado es real e importante para ellos, y hemos definido los segmentos de cliente prioritarios.',
  'Hemos validado que nuestra solución resuelve el problema del cliente (problem-solution fit) y usuarios/clientes han expresado interés explícito en usarla o comprarla.',
  'Clientes reales han probado el producto/servicio y han confirmado su valor. Tenemos métricas de satisfacción (NPS u otras) y una propuesta de valor actualizada.',
  'Hemos realizado primeras ventas o acuerdos comerciales formales con clientes reales, y contamos con un número inicial de usuarios activos del producto/servicio.',
  'Contamos con un proceso de ventas/adquisición de usuarios implementado con herramientas de soporte (CRM, automatización) y personal dedicado a ventas.',
  'Tenemos una base sustancial y creciente de usuarios/clientes activos con indicadores de retención positivos y un proceso de expansión de mercado en curso.',
];

const BRL_TEXTS: readonly string[] = [
  'Tenemos una descripción del modelo de negocio propuesto (propuesta de valor, segmentos de cliente, fuentes de ingreso, estructura de costos y canales de distribución).',
  'Hemos definido el mercado objetivo con estimaciones de tamaño (TAM/SAM) e identificado los principales competidores y sus modelos de negocio.',
  'Contamos con proyecciones financieras simplificadas (P&L) que muestren viabilidad económica potencial, incluyendo los principales costos e ingresos esperados.',
  'Hemos recibido retroalimentación de clientes, socios o expertos de mercado sobre la viabilidad del modelo de negocio (pricing, canales, propuesta de valor).',
  'Hemos realizado una primera evaluación de la contribución positiva y negativa de nuestro modelo de negocio al medio ambiente y la sociedad.',
  'El modelo de negocio ha sido probado en escenarios comerciales reales (venta de prueba, piloto, preventa) y los resultados muestran viabilidad económica.',
  'Las primeras ventas o ingresos comerciales demuestran disposición a pagar de clientes, y las proyecciones financieras han sido validadas con datos reales.',
  'El modelo de negocio opera de forma estable (1–3 años), cumple expectativas de rentabilidad, sostenibilidad ambiental/social y tiene sistemas de métricas implementados.',
];

const IPRL_TEXTS: readonly string[] = [
  'Hemos identificado y listado los posibles activos de propiedad intelectual generados o utilizados en nuestro proyecto (código, marca, diseño, datos, procesos).',
  'Hemos clarificado la titularidad de la propiedad intelectual del proyecto (quiénes son los creadores/inventores, acuerdos de asignación firmados) y podemos usar la IPR relevante.',
  'Hemos evaluado las posibilidades de protección de nuestra IPR clave, ya sea mediante búsquedas propias o con asesoría de un profesional en PI.',
  'Hemos elaborado un borrador de estrategia de PI que define qué activos proteger, cómo y por qué (relevancia para el negocio), idealmente validado por un asesor profesional.',
  'Hemos presentado al menos una solicitud formal de registro o protección de PI clave (marca, patente, derechos de autor, etc.) en al menos un país o región relevante.',
  'Contamos con una estrategia de PI completa y validada por un profesional. Se han recibido respuestas positivas de las autoridades competentes sobre solicitudes presentadas.',
  'La IPR clave ha sido concedida y registrada en los países/regiones más relevantes para nuestro negocio y se gestiona activamente (renovaciones, vigilancia).',
  'Nuestra estrategia de PI está plenamente implementada, la IPR crea valor demostrable para el negocio y contamos con acuerdos de acceso a toda PI externa necesaria.',
];

const TmRL_TEXTS: readonly string[] = [
  "Existe al menos un responsable claro ('champion') con idea concreta de cómo llevar el proyecto adelante y comprometido a dedicar tiempo significativo.",
  'El equipo actual (1 o más personas) cuenta con algunas de las competencias necesarias para verificar/desarrollar la idea, aunque no todas las capacidades clave están cubiertas.',
  'Hemos identificado las brechas de competencias y capacidad del equipo actual y tenemos un plan para incorporar los perfiles faltantes en el corto plazo (< 1 año).',
  'El equipo fundador inicial tiene las competencias principales necesarias, ha acordado formalmente roles, metas, compromiso de tiempo y estructura de participación (equity).',
  'El equipo fundador es complementario, diverso (género, background, experiencia) y cuenta con todas las competencias clave para la etapa actual. Existe un CEO definido.',
  'El equipo tiene un plan de crecimiento organizacional a 2 años, ha iniciado incorporación de asesores o miembros de junta directiva, y tiene procesos de conocimiento compartido.',
  'Existe una organización con liderazgo claro, junta directiva funcional, políticas de RRHH implementadas y programas de capacitación y desarrollo del personal.',
  'La organización es de alto desempeño, con cultura documentada, incentivos alineados a metas, aprendizaje continuo y el equipo directivo se mantiene y desarrolla con el tiempo.',
];

const FRL_TEXTS: readonly string[] = [
  'Tenemos claridad sobre las actividades y costos necesarios para verificar el potencial de la idea en los próximos 1–6 meses, y conocemos las principales opciones de financiamiento disponibles.',
  'Contamos con un plan básico de actividades de verificación con cronograma, necesidad de financiamiento estimada y fuentes identificadas para los hitos iniciales.',
  'Hemos asegurado financiamiento suficiente para ejecutar las actividades de verificación/validación iniciales (1–6 meses), ya sea mediante fondos propios, institucionales o de terceros.',
  'Contamos con un plan elaborado de verificación del potencial comercial (3–12 meses) con hipótesis, actividades, cronograma y necesidad de financiamiento, y hemos asegurado fondos para ejecutarlo.',
  'Hemos elaborado un pitch de financiamiento para inversores, definido una estrategia de funding y contamos con un presupuesto de P&L inicial para los próximos 12 meses.',
  'El pitch de financiamiento ha sido probado y mejorado con audiencias relevantes. Hemos iniciado contactos formales con fuentes de financiamiento externas (inversores, fondos, banca).',
  'Tenemos conversaciones concretas con fuentes de financiamiento externas interesadas y contamos con toda la documentación de due diligence lista para revisión externa.',
  'Contamos con financiamiento asegurado para al menos 6–12 meses de operación, con sistema de monitoreo financiero implementado e ingresos recurrentes en crecimiento.',
];

const TEXTS_BY_CODE: Record<string, readonly string[]> = {
  TRL: TRL_TEXTS,
  CRL: CRL_TEXTS,
  BRL: BRL_TEXTS,
  IPRL: IPRL_TEXTS,
  TmRL: TmRL_TEXTS,
  FRL: FRL_TEXTS,
};

export const STATEMENTS: readonly StatementSeed[] = DIMENSIONS.flatMap((d) => {
  const texts = TEXTS_BY_CODE[d.codigo];
  if (texts?.length !== 8) {
    throw new Error(
      `Dimension ${d.codigo} must have exactly 8 statement texts`,
    );
  }
  return texts.map((textoEs, index) => ({
    dimensionCodigo: d.codigo,
    numeroenDimension: index + 1,
    textoEs,
  }));
});

if (STATEMENTS.length !== 48) {
  throw new Error(
    `Expected exactly 48 statements; computed ${STATEMENTS.length}`,
  );
}

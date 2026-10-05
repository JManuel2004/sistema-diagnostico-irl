import type { DimensionCode } from '@innlab/contracts';

/**
 * What each IRL level means: one sentence per dimension and level (6 × 9),
 * and one per global level (9). The results show it next to every score, so
 * «4 de 9» says what being at level 4 means.
 *
 * Dimension texts: **official**, from the program's document
 * (`irl-di-v4.pdf`, section 3, the table of the six maturity dimensions),
 * transcribed verbatim with the PDF's line breaks rejoined.
 *
 * ⚠ Global texts: **SIMULATED AND PROVISIONAL**, pending INNLAB. No source
 * describes the global level — the KTH framework assesses each dimension on
 * its own, and the global level is the system's average of the six. They
 * were written from the dimension texts of each level, so the screen can
 * explain the global score until INNLAB delivers its own.
 *
 * They explain the levels; they are not what the user answered. That is
 * why the seed updates them even on a framework version already in use,
 * unlike the statements and the conversion table.
 */
export const DIMENSION_LEVEL_DESCRIPTIONS: Readonly<
  Record<DimensionCode, readonly string[]>
> = {
  TRL: [
    'Se han observado y reportado principios básicos científicos.',
    'Se ha formulado el concepto tecnológico y sus posibles aplicaciones.',
    'Experimentos demuestran que la tecnología funciona en teoría.',
    'Los componentes funcionan integrados en entorno de laboratorio.',
    'La tecnología es fiable en un entorno que simula condiciones reales.',
    'El sistema completo funciona como prototipo en entorno operativo real.',
    'Sistema demostrado con éxito en su forma final y entorno operativo.',
    'Tecnología ha pasado pruebas de certificación y calidad industrial.',
    'Tecnología en producción masiva y función estable a gran escala.',
  ],
  CRL: [
    'Se ha identificado una necesidad o problema potencial en un grupo de usuarios.',
    'El problema ha sido confirmado a través de entrevistas iniciales con clientes.',
    'La propuesta de valor ha sido validada directamente con el público objetivo.',
    'Prototipo básico probado por usuarios con feedback positivo.',
    'Evidencia de tracción; los usuarios muestran interés real en adquirirla.',
    'Ventas piloto o pruebas beta con clientes que pagan o se comprometen.',
    'Se ha alcanzado el "Product-Market Fit" (satisfacción plena de demanda).',
    'Ventas recurrentes y estrategia clara de retención de clientes.',
    'El producto tiene una posición dominante en su mercado objetivo.',
  ],
  BRL: [
    'Existe una idea inicial de cómo el proyecto podría generar valor económico.',
    'Se han esbozado los elementos básicos del modelo de negocio.',
    'Las hipótesis más críticas sobre cómo ganar dinero han sido testadas.',
    'Se han validado los costos estimados y la disposición de pago.',
    'Estrategia de precios clara basada en el valor aportado.',
    'Se ha demostrado que el modelo de ingresos es escalable y repetible.',
    'Firmados acuerdos con socios clave para distribución o producción.',
    'El negocio es rentable o tiene una ruta clara y probada hacia ello.',
    'El modelo de negocio está totalmente consolidado y es sostenible.',
  ],
  IPRL: [
    'Se ha realizado una búsqueda inicial para ver si existen ideas similares protegidas.',
    'Se ha analizado si hay libertad de operación para trabajar en esta tecnología.',
    'Se ha definido una estrategia formal de protección (patentes, marcas).',
    'Se ha iniciado el proceso legal de protección (ej. solicitud de patente).',
    'La estrategia de protección se ha extendido a nivel internacional (PCT).',
    'Derechos de IP críticos otorgados o asegurados.',
    'Sistema de vigilancia activo para defender la IP contra terceros.',
    'La IP se está monetizando (licencias o exclusividad).',
    'La IP es un activo financiero estratégico que genera valor por sí solo.',
  ],
  TmRL: [
    'Hay una persona o grupo pequeño con la intención de desarrollar la idea.',
    'Los miembros han definido sus roles y responsabilidades iniciales.',
    'El equipo núcleo está formado y dedica tiempo constante al proyecto.',
    'El equipo ha identificado brechas de habilidades y planes para cubrirlas.',
    'Se han incorporado expertos o asesores para fortalecer áreas débiles.',
    'Estructura organizacional clara e incentivos alineados.',
    'Capacidad operativa para gestionar el crecimiento acelerado.',
    'Equipo directivo (C-Level) consolidado y gobernanza sólida.',
    'Organización funciona con procesos maduros y liderazgo de alto nivel.',
  ],
  FRL: [
    'Se ha estimado a "grosso modo" cuánto dinero se necesita para empezar.',
    'Se han identificado fuentes potenciales de capital (becas, ahorros, FFF).',
    'Se conoce exactamente qué hitos se deben alcanzar para atraer inversión.',
    'Se ha asegurado el primer financiamiento externo (semilla o subsidio).',
    'El presupuesto para la fase de escalado está detallado y aprobado.',
    'El proyecto es atractivo para inversores profesionales (Venture Capital).',
    'Preparando o cerrando una ronda de inversión importante (Serie A).',
    'Flujo de caja permite operación estable o Serie B asegurada.',
    'Empresa financieramente autónoma o se prepara para salida (IPO).',
  ],
};

/** Index 0 is level 1. Simulated: see the note above. */
export const GLOBAL_LEVEL_DESCRIPTIONS: readonly string[] = [
  'La iniciativa es una idea inicial: se identificó una oportunidad, pero casi todo está por definir.',
  'La idea tiene una primera forma: se exploraron el problema, la solución y el equipo, sin validación todavía.',
  'Las hipótesis principales están planteadas y se empiezan a probar con experimentos y conversaciones con usuarios.',
  'Hay una primera validación: una propuesta o un prototipo probado con usuarios y un modelo de negocio con supuestos verificados.',
  'La iniciativa muestra tracción temprana: la solución funciona en condiciones cercanas a las reales y hay interés concreto del mercado.',
  'La iniciativa opera en un entorno real: pilotos o primeras ventas, un modelo de ingresos que se repite y un equipo estructurado.',
  'La iniciativa está lista para crecer: producto en su forma final, ajuste con el mercado y capacidad para atraer inversión.',
  'La iniciativa es un negocio en marcha: ventas recurrentes, operación estable y una organización consolidada.',
  'La iniciativa es madura y sostenible: posición sólida en su mercado, autonomía financiera y procesos plenamente consolidados.',
];

// Import-time guards, as in `statements.ts`: a missing text fails the seed
// instead of leaving a score without its meaning.
for (const [code, texts] of Object.entries(DIMENSION_LEVEL_DESCRIPTIONS)) {
  if (
    texts.length !== 9 ||
    texts.some((t) => t.trim().length === 0 || t.length > 300)
  ) {
    throw new Error(
      `${code} needs nine level texts, non-blank and up to 300 characters`,
    );
  }
}
if (
  GLOBAL_LEVEL_DESCRIPTIONS.length !== 9 ||
  GLOBAL_LEVEL_DESCRIPTIONS.some((t) => t.trim().length === 0 || t.length > 300)
) {
  throw new Error(
    'The global level needs nine texts, non-blank and up to 300 characters',
  );
}

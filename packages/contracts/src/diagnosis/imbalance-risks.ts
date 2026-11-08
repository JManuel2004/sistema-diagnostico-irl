import type { DimensionCode } from '../irl-taxonomy/dimension.schema.js';

/**
 * What an initiative risks when one dimension of an imbalanced pair runs
 * ahead of the other: the consequence of the imbalance, so the alert says
 * why closing it matters (client validation of RF-11). Keyed by the pair
 * as `ahead→behind`, for the six pairs of the framework (TRL–CRL, TRL–BRL,
 * CRL–BRL, TmRL–FRL, BRL–IPRL, TRL–IPRL), in both directions.
 *
 * Shared by the results screen and the PDF report, so both say the same.
 * Only codes live here: the names are the API's and are not repeated.
 */
const RISKS: Readonly<Partial<Record<`${DimensionCode}→${DimensionCode}`, string>>> = {
  'TRL→CRL':
    'Desarrollar una solución que el mercado todavía no ha validado: puedes invertir tiempo y dinero en algo que nadie adopte.',
  'CRL→TRL':
    'Tener clientes interesados y una solución que aún no está lista para ellos: puedes perder su confianza o la oportunidad.',
  'TRL→BRL':
    'Una solución avanzada sin un modelo de negocio claro: no sabrás cómo generar ingresos ni cómo sostenerla.',
  'BRL→TRL': 'Un modelo de negocio que promete algo que la solución todavía no puede entregar.',
  'CRL→BRL':
    'Conocer a tus clientes sin saber cómo capturar valor de ellos: la demanda no se convierte en ingresos sostenibles.',
  'BRL→CRL':
    'Un modelo de negocio construido sobre supuestos de clientes que aún no se han validado.',
  'TmRL→FRL':
    'Un equipo listo para avanzar sin recursos para sostener su dedicación: puede desarmarse antes de lograr resultados.',
  'FRL→TmRL':
    'Recursos disponibles sin el equipo, las capacidades o la dedicación para aprovecharlos bien.',
  'BRL→IPRL':
    'Un negocio que depende de conocimiento sin proteger: un competidor podría copiarlo y quitarte la ventaja.',
  'IPRL→BRL':
    'Invertir en proteger la propiedad intelectual sin saber todavía cómo se va a rentabilizar.',
  'TRL→IPRL':
    'Una tecnología desarrollada sin protección ni acuerdos sobre quién es su dueño: queda expuesta a copia o plagio y a disputas por su titularidad.',
  'IPRL→TRL':
    'Proteger una tecnología que todavía puede cambiar mucho: la protección puede quedar desactualizada antes de usarse.',
};

/**
 * What the distance means when `ahead` runs ahead of `behind`, and what to
 * do about it (usability test P01: the imbalances did not explain what the
 * distance means). Same keys as `RISKS`.
 */
const GUIDANCE: Readonly<
  Partial<Record<`${DimensionCode}→${DimensionCode}`, { meaning: string; action: string }>>
> = {
  'TRL→CRL': {
    meaning: 'La solución avanza más rápido que la evidencia de que alguien la necesita.',
    action:
      'Antes de seguir desarrollando, valida el problema y la solución con clientes reales: entrevistas, pruebas, una preventa.',
  },
  'CRL→TRL': {
    meaning: 'Hay clientes interesados, pero la solución no está lista para ellos.',
    action:
      'Prioriza llevar la solución a un nivel que esos clientes puedan usar, aunque sea una versión acotada.',
  },
  'TRL→BRL': {
    meaning: 'Hay una solución avanzada sin claridad de cómo generará ingresos.',
    action:
      'Define a quién le cobras, cuánto y por qué canal, y prueba esas hipótesis antes de seguir invirtiendo en la tecnología.',
  },
  'BRL→TRL': {
    meaning: 'El modelo de negocio promete algo que la solución aún no entrega.',
    action:
      'Ajusta lo que ofreces a lo que la solución hace hoy, o enfoca el desarrollo en lo que el modelo necesita.',
  },
  'CRL→BRL': {
    meaning: 'Conoces la demanda, pero no cómo convertirla en ingresos sostenibles.',
    action: 'Prueba precio y disposición a pagar con los clientes que ya validaste.',
  },
  'BRL→CRL': {
    meaning: 'El modelo descansa en supuestos de clientes que no se han comprobado.',
    action: 'Valida esos supuestos con clientes reales antes de comprometer recursos en el modelo.',
  },
  'TmRL→FRL': {
    meaning: 'El equipo está listo, pero sin recursos que sostengan su dedicación.',
    action: 'Busca financiación para los próximos hitos: convocatorias, capital semilla o aliados.',
  },
  'FRL→TmRL': {
    meaning: 'Hay recursos, pero no el equipo para aprovecharlos.',
    action: 'Incorpora las capacidades que faltan o asegura más dedicación de las personas clave.',
  },
  'BRL→IPRL': {
    meaning: 'El negocio depende de conocimiento sin proteger.',
    action:
      'Identifica qué es lo que te diferencia y evalúa cómo protegerlo antes de exponerlo más.',
  },
  'IPRL→BRL': {
    meaning: 'Se invierte en proteger sin saber cómo se rentabilizará.',
    action: 'Antes de seguir registrando, define cómo la protección genera valor para el negocio.',
  },
  'TRL→IPRL': {
    meaning: 'La tecnología avanza sin protección ni acuerdos de titularidad.',
    action: 'Firma acuerdos sobre quién es dueño de lo creado y evalúa su protección.',
  },
  'IPRL→TRL': {
    meaning: 'Se protege una tecnología que todavía puede cambiar mucho.',
    action: 'Protege lo esencial y espera a que la tecnología se estabilice para lo demás.',
  },
};

/** The risk of `ahead` running ahead of `behind`, or `null` for a pair outside the six. */
export function imbalanceRisk(ahead: DimensionCode, behind: DimensionCode): string | null {
  return RISKS[`${ahead}→${behind}`] ?? null;
}

/** An imbalanced pair explained: what the distance means, what it risks and what to do. */
export interface ImbalanceGuidance {
  readonly meaning: string;
  readonly risk: string;
  readonly action: string;
}

/** The guidance of `ahead` running ahead of `behind`, or `null` for a pair outside the six. */
export function imbalanceGuidance(
  ahead: DimensionCode,
  behind: DimensionCode,
): ImbalanceGuidance | null {
  const key = `${ahead}→${behind}` as const;
  const risk = RISKS[key];
  const guidance = GUIDANCE[key];
  return risk && guidance ? { ...guidance, risk } : null;
}

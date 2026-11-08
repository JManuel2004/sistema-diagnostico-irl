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
 * What an initiative risks when both dimensions of an imbalanced pair are in
 * gap (level 3 or lower): neither one runs ahead, both are weak, and the
 * risk is of the pair as a whole. Keyed by the pair in the framework's order.
 */
const BOTH_IN_GAP_RISKS: Readonly<Partial<Record<`${DimensionCode}–${DimensionCode}`, string>>> = {
  'TRL–CRL':
    'Ni la solución ni el mercado están probados todavía: lo que avances en una puede perderse si la otra no la acompaña.',
  'TRL–BRL':
    'Una solución todavía inmadura y sin modelo de negocio: aún no hay con qué demostrar que la iniciativa es viable.',
  'CRL–BRL':
    'Sin clientes validados ni un modelo de negocio claro, no hay evidencia de que alguien vaya a pagar por la solución.',
  'TmRL–FRL':
    'Un equipo incompleto y sin recursos para sostenerse: la iniciativa depende del esfuerzo de pocas personas y puede detenerse.',
  'BRL–IPRL':
    'Un modelo de negocio sin definir y sin proteger lo que lo diferencia: lo que construyas puede copiarse antes de generar ingresos.',
  'TRL–IPRL':
    'Una tecnología todavía en desarrollo, sin protección ni acuerdos sobre quién es su dueño: puede haber disputas cuando empiece a tener valor.',
};

/** The risk of `ahead` running ahead of `behind`, or `null` for a pair outside the six. */
export function imbalanceRisk(ahead: DimensionCode, behind: DimensionCode): string | null {
  return RISKS[`${ahead}→${behind}`] ?? null;
}

/** The risk of a pair whose two dimensions are in gap, or `null` for a pair outside the six. */
export function bothInGapRisk(left: DimensionCode, right: DimensionCode): string | null {
  return BOTH_IN_GAP_RISKS[`${left}–${right}`] ?? BOTH_IN_GAP_RISKS[`${right}–${left}`] ?? null;
}

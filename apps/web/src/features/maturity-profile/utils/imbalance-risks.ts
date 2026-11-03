import type { DimensionCode } from '@innlab/contracts';

/**
 * What an initiative risks when one dimension of an imbalanced pair runs
 * ahead of the other: the consequence of the imbalance, so the alert says
 * why closing it matters (client validation of RF-11). Keyed by the pair
 * as `ahead→behind`, for the six pairs of the framework (TRL–CRL, TRL–BRL,
 * CRL–BRL, TmRL–FRL, BRL–IPRL, TRL–IPRL), in both directions.
 *
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

/** The risk of `ahead` running ahead of `behind`, or `null` for a pair outside the six. */
export function imbalanceRisk(ahead: DimensionCode, behind: DimensionCode): string | null {
  return RISKS[`${ahead}→${behind}`] ?? null;
}

import type { Recommendation } from '../entities/recommendation.aggregate.js';

/**
 * Puerto del agregado `Recommendation`.
 *
 * Contrato de atomicidad, explícito y no negociable: `save` persiste la
 * recomendación, sus alternatives y su traza **dentro de una única
 * transacción**. Son tres escrituras de un mismo hecho; una recomendación
 * sin traza es una caja negra y unas alternatives huérfanas son basura.
 *
 * Se enuncia aquí porque el módulo de perfil de madurez ya tiene un
 * puerto que promete atomicidad en su docstring y un caso de uso que la
 * rompe con `Promise.all`. Documentarlo no basta: el adaptador debe
 * envolver en `manager.transaction()` y hay una prueba de integración que
 * lo verifica.
 */
export const RECOMMENDATION_REPOSITORY = Symbol('RECOMMENDATION_REPOSITORY');

export interface RecommendationRepositoryPort {
  save(recommendation: Recommendation): Promise<void>;
  findByDiagnosticId(diagnosticId: string): Promise<Recommendation | null>;
}

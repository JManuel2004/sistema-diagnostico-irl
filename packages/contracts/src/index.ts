// Barrel del paquete @innlab/contracts — única superficie pública.
//
// Convención: solo se re-exporta lo que tanto backend como frontend
// necesiten consumir. Si algo se usa nada más dentro del propio
// paquete (helpers internos, etc.), NO va aquí. Mantener este archivo
// como la fuente canónica del contrato facilita tree-shaking y deja
// claro qué API se compromete a no romper sin aviso.

// ── common ────────────────────────────────────────────────────────────
export * from './common/uuid.schema.js';
export * from './common/problem-details.schema.js';

// ── catalog ───────────────────────────────────────────────────────────
export * from './catalog/dimension.schema.js';
export * from './catalog/questionnaire-structure.schema.js';

// ── questionnaire ─────────────────────────────────────────────────────
export * from './questionnaire/likert.schema.js';
export * from './questionnaire/statement.schema.js';
export * from './questionnaire/answer.schema.js';
export * from './questionnaire/submission.schema.js';

// ── maturity profile ──────────────────────────────────────────────────
export * from './maturity-profile/dimension-result.schema.js';
export * from './maturity-profile/bottleneck.schema.js';
export * from './maturity-profile/gaps.schema.js';
export * from './maturity-profile/asymmetry.schema.js';
export * from './maturity-profile/imbalance.schema.js';
export * from './maturity-profile/profile-response.schema.js';

// ── diagnostic ────────────────────────────────────────────────────────
export * from './diagnostic/diagnostic.schema.js';
export * from './diagnostic/consent.schema.js';

// ── initiative ────────────────────────────────────────────────────────
export * from './initiative/initiative.schema.js';

// ── portfolio routing ─────────────────────────────────────────────────
export * from './portfolio-routing/predicado.schema.js';
export * from './portfolio-routing/hechos-diagnostico.schema.js';
export * from './portfolio-routing/recomendacion-response.schema.js';
export * from './portfolio-routing/traza-capas.schema.js';

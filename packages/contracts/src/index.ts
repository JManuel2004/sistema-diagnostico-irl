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

// ── irl-taxonomy (shared/irl-taxonomy) ────────────────────────────────
export * from './irl-taxonomy/dimension.schema.js';

// ── diagnosis ─────────────────────────────────────────────────────────
export * from './diagnosis/questionnaire-structure.schema.js';
export * from './diagnosis/likert.schema.js';
export * from './diagnosis/statement.schema.js';
export * from './diagnosis/answer.schema.js';
export * from './diagnosis/submission.schema.js';
export * from './diagnosis/dimension-result.schema.js';
export * from './diagnosis/bottleneck.schema.js';
export * from './diagnosis/gaps.schema.js';
export * from './diagnosis/asymmetry.schema.js';
export * from './diagnosis/imbalance.schema.js';
export * from './diagnosis/profile-response.schema.js';
export * from './diagnosis/diagnostic.schema.js';

// ── identity (shared/identity) ────────────────────────────────────────
export * from './identity/core-session.schema.js';

// ── initiative ────────────────────────────────────────────────────────
export * from './initiative/consent.schema.js';
export * from './initiative/initiative.schema.js';

// ── routing ───────────────────────────────────────────────────────────
export * from './routing/predicate.schema.js';
export * from './routing/diagnostic-facts.schema.js';
export * from './routing/recommendation-response.schema.js';
export * from './routing/layer-trace.schema.js';

// ── roadmap ───────────────────────────────────────────────────────────
export * from './roadmap/roadmap-response.schema.js';

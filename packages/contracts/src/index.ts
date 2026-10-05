// Barrel of the @innlab/contracts package — its only public surface.
//
// Convention: only what both backend and frontend need to consume is
// re-exported. Anything used only inside the package (internal helpers,
// etc.) does NOT go here. Keeping this file as the canonical source of the
// contract makes clear which API is promised not to break without notice.

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
export * from './diagnosis/critical-state.schema.js';
export * from './diagnosis/asymmetry.schema.js';
export * from './diagnosis/imbalance.schema.js';
export * from './diagnosis/profile-response.schema.js';
export * from './diagnosis/diagnostic.schema.js';

// ── identity (shared/identity) ────────────────────────────────────────
export * from './identity/core-session.schema.js';
export * from './identity/me-context.schema.js';

// ── initiative ────────────────────────────────────────────────────────
export * from './initiative/consent.schema.js';
export * from './initiative/initiative.schema.js';

// ── routing ───────────────────────────────────────────────────────────
export * from './routing/predicate.schema.js';
export * from './routing/diagnostic-facts.schema.js';
export * from './routing/service-detail.schema.js';
export * from './routing/recommendation-response.schema.js';
export * from './routing/layer-trace.schema.js';

// ── roadmap ───────────────────────────────────────────────────────────
export * from './roadmap/roadmap-response.schema.js';

// ── reporting ─────────────────────────────────────────────────────────
export * from './reporting/report-response.schema.js';

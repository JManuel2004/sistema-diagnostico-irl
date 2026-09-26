/**
 * The version of the KTH IRL framework content (statements and conversion
 * table) this seed publishes.
 *
 * A diagnostic records the version it was answered with, so the content of
 * a published version is never rewritten once a diagnostic uses it: to
 * change a statement's text or a conversion range, add a new version here
 * (new code, later `publishedAt`) with the whole content, and new
 * diagnostics take it. The seed refuses to rewrite a version already in use.
 */
export interface FrameworkVersionSeed {
  readonly code: string;
  readonly publishedAt: string;
}

export const FRAMEWORK_VERSION: FrameworkVersionSeed = {
  code: 'KTH-IRL-1.0',
  publishedAt: '2026-05-18T00:00:00.000Z',
};

import type { TaxonomyRepositoryPort } from '../../../../../src/shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { FrameworkVersion } from '../../../../../src/shared/irl-taxonomy/domain/entities/framework-version.js';

/** The framework version the unit tests' diagnostics are answered with. */
export const FRAMEWORK_VERSION = FrameworkVersion.fromPersistence({
  id: 1,
  code: 'KTH-IRL-1.0',
  publishedAt: new Date('2026-05-18T00:00:00.000Z'),
});

/** A taxonomy that only knows `FRAMEWORK_VERSION`. */
export function frameworkTaxonomy(): TaxonomyRepositoryPort {
  return {
    findCurrentFrameworkVersion: () => Promise.resolve(FRAMEWORK_VERSION),
    findFrameworkVersionById: (id: number) =>
      Promise.resolve(id === FRAMEWORK_VERSION.id ? FRAMEWORK_VERSION : null),
    findFrameworkVersionByCode: (code: string) =>
      Promise.resolve(code === FRAMEWORK_VERSION.code ? FRAMEWORK_VERSION : null),
  } as unknown as TaxonomyRepositoryPort;
}

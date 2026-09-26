import type { TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';

/**
 * The code of each framework version id, resolved through the taxonomy. A
 * version a diagnostic points to always exists (foreign key), so a missing
 * one is a broken catalog and throws.
 */
export async function frameworkVersionCodes(
  taxonomy: TaxonomyRepositoryPort,
  ids: readonly number[],
): Promise<ReadonlyMap<number, string>> {
  const codes = new Map<number, string>();
  for (const id of new Set(ids)) {
    const version = await taxonomy.findFrameworkVersionById(id);
    if (!version) throw new Error(`Framework version ${String(id)} does not exist`);
    codes.set(id, version.code);
  }
  return codes;
}

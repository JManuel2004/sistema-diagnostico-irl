import { Dimension } from '../../../src/shared/irl-taxonomy/domain/entities/dimension.js';

const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

/**
 * The six dimensions as the taxonomy port returns them. The names are
 * deliberately distinctive (`Nombre completo TRL`, `Corto TRL`) so a test
 * can tell a value that came from the catalog from a dimension code.
 */
export function aDimensionCatalog(): Dimension[] {
  return CODES.map((code, index) =>
    Dimension.fromPersistence({
      id: index + 1,
      code,
      name: `Nombre completo ${code}`,
      shortName: `Corto ${code}`,
      description: `Descripción ${code}`,
      sequence: index + 1,
      minimumExpectedLevel: 4,
    }),
  );
}

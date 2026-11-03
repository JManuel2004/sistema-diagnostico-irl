import type { SectorOption } from '@innlab/contracts';

/**
 * Search of the sector catalog for the registration form.
 *
 * A sector is found by its code («k»), by its official title, by the
 * related words the catalog gives it («software», «finanzas», «salud») and
 * by the line on what it groups («peluquería» finds T), ignoring case and
 * accents. Each word typed must match the start of a word of the sector (so
 * «tecno» finds «tecnología» and «fin» finds «financieras» and «finanzas»);
 * several words narrow the search. The results go from the best match to
 * the weakest — the code, then the title, then a related word, then the
 * description — and keep the catalog's order among equals.
 *
 * «Otro sector (especificar)» is never filtered out: it is always offered,
 * last, so a user who does not find their activity still has a way out.
 */
export interface SectorSearchResult {
  /** The CIIU sections that match, best first. */
  readonly matches: readonly SectorOption[];
  /** «Otro sector (especificar)», if the catalog has it. */
  readonly other: SectorOption | undefined;
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function wordsOf(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean);
}

/** How well a sector matches the typed words: 0 for no match, higher is better. */
function score(sector: SectorOption, terms: readonly string[]): number {
  const code = normalizeText(sector.code ?? '');
  const title = wordsOf(sector.name);
  const related = sector.keywords.flatMap(wordsOf);
  const described = wordsOf(sector.description);
  let total = 0;
  for (const term of terms) {
    if (terms.length === 1 && term === code) total += 100;
    else if (title.some((word) => word.startsWith(term))) total += 10;
    else if (related.some((word) => word.startsWith(term))) total += 5;
    else if (described.some((word) => word.startsWith(term))) total += 3;
    else return 0;
  }
  return total;
}

export function searchSectors(sectors: readonly SectorOption[], query: string): SectorSearchResult {
  const sections = sectors.filter((s) => !s.isOther);
  const other = sectors.find((s) => s.isOther);
  const terms = wordsOf(query);
  if (terms.length === 0) return { matches: sections, other };

  const matches = sections
    .map((sector, index) => ({ sector, index, score: score(sector, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.sector);
  return { matches, other };
}

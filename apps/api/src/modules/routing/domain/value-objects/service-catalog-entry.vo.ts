/**
 * What the catalog says about a service: its card for whoever reads a
 * result (what it is, what it can achieve, which initiatives it suits) and
 * its tier. It describes the service, not a result, so it is read live
 * wherever a service is shown instead of being copied into the result.
 */
export interface ServiceCatalogEntry {
  readonly idService: number;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string | null;
  readonly scope: string;
  readonly band: {
    readonly minLevel: number;
    readonly maxLevel: number;
  } | null;
  readonly tier: {
    readonly code: string;
    readonly name: string;
    readonly order: number;
    readonly tagline: string | null;
    readonly description: string | null;
  };
}

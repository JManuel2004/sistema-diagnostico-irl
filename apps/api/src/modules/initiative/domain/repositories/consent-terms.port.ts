/** A published consent text (catalog, read-only at runtime). */
export interface ConsentTermsEntry {
  readonly version: string;
  readonly title: string;
  readonly sections: readonly { readonly heading: string; readonly body: string }[];
  readonly checkboxLabel: string;
  readonly publishedAt: Date;
}

export const CONSENT_TERMS_CATALOG = Symbol('CONSENT_TERMS_CATALOG');

export interface ConsentTermsCatalogPort {
  /** The latest published text — the one to accept — or `null` before any seed. */
  findCurrent(): Promise<ConsentTermsEntry | null>;
}

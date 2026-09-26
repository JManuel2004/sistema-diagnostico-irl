import type { Initiative } from '../../../../../src/modules/initiative/domain/entities/initiative.aggregate.js';
import type { Consent } from '../../../../../src/modules/initiative/domain/entities/consent.entity.js';
import type { InitiativeProfile } from '../../../../../src/modules/initiative/domain/entities/initiative-profile.aggregate.js';
import type { InitiativeRepositoryPort } from '../../../../../src/modules/initiative/domain/repositories/initiative.repository.port.js';
import type { ConsentRepositoryPort } from '../../../../../src/modules/initiative/domain/repositories/consent.repository.port.js';
import type { InitiativeProfileRepositoryPort } from '../../../../../src/modules/initiative/domain/repositories/initiative-profile.repository.port.js';
import type {
  ConsentTermsCatalogPort,
  ConsentTermsEntry,
} from '../../../../../src/modules/initiative/domain/repositories/consent-terms.port.js';
import type { InitiativeCatalogPort } from '../../../../../src/modules/initiative/domain/repositories/initiative-catalog.port.js';

/** In-memory initiatives and their consents (the history is kept whole). */
export class FakeInitiatives implements InitiativeRepositoryPort, ConsentRepositoryPort {
  readonly initiatives: Initiative[] = [];
  readonly consents: Consent[] = [];

  findById(id: string): Promise<Initiative | null> {
    return Promise.resolve(this.initiatives.find((i) => i.id.value === id) ?? null);
  }

  findByOwner(ownerId: string): Promise<Initiative[]> {
    return Promise.resolve(this.initiatives.filter((i) => i.ownerId === ownerId).reverse());
  }

  createWithConsent(initiative: Initiative, consent: Consent): Promise<void> {
    this.initiatives.push(initiative);
    this.consents.push(consent);
    return Promise.resolve();
  }

  findLatestByInitiativeId(initiativeId: string): Promise<Consent | null> {
    const own = this.consents.filter((c) => c.initiativeId.value === initiativeId);
    return Promise.resolve(own[own.length - 1] ?? null);
  }

  add(consent: Consent): Promise<void> {
    this.consents.push(consent);
    return Promise.resolve();
  }
}

/** In-memory profile snapshots, one per diagnostic. */
export class FakeProfiles implements InitiativeProfileRepositoryPort {
  readonly profiles: InitiativeProfile[] = [];

  findByDiagnosticId(diagnosticId: string): Promise<InitiativeProfile | null> {
    return Promise.resolve(this.profiles.find((p) => p.diagnosticId.value === diagnosticId) ?? null);
  }

  findLatestByInitiativeId(initiativeId: string): Promise<InitiativeProfile | null> {
    const own = this.profiles.filter((p) => p.initiativeId.value === initiativeId);
    return Promise.resolve(own[own.length - 1] ?? null);
  }

  save(profile: InitiativeProfile): Promise<void> {
    const i = this.profiles.findIndex((p) => p.diagnosticId.value === profile.diagnosticId.value);
    if (i >= 0) this.profiles.splice(i, 1);
    this.profiles.push(profile);
    return Promise.resolve();
  }
}

export function termsAt(version: string | null): ConsentTermsCatalogPort {
  const entry: ConsentTermsEntry | null = version
    ? {
        version,
        title: 'Autorización',
        sections: [{ heading: 'Responsable', body: 'INNLAB' }],
        checkboxLabel: 'Acepto',
        publishedAt: new Date('2026-09-20T00:00:00.000Z'),
      }
    : null;
  return { findCurrent: () => Promise.resolve(entry) };
}

export const CATALOG: InitiativeCatalogPort = {
  findAllSectors: () => Promise.resolve([{ id: '1', name: 'Agroindustria' }]),
  findSectorById: (id: string) =>
    Promise.resolve(id === '1' ? { id: '1', name: 'Agroindustria' } : null),
  findAllStages: () =>
    Promise.resolve([{ id: '2', code: 'validacion', name: 'Validación', sequence: 2 }]),
  findStageById: (id: string) =>
    Promise.resolve(id === '2' ? { id: '2', code: 'validacion', name: 'Validación', sequence: 2 } : null),
  findStageByCode: () => Promise.resolve(null),
};

/**
 * People who can enter a testing deploy without INNLAB.
 *
 * Each id is a UUID so it satisfies the same contract as a Cognito `sub`.
 * None of them exist in INNLAB Core and must never be sent there. The first
 * id is the original single bypass user, so a session opened before the
 * picker still belongs to the same person.
 */
export const BYPASS_ISSUER = 'irl-diagnostic-bypass';

export interface BypassParticipant {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly company: {
    readonly id: string;
    readonly name: string;
    readonly role: 'OWNER' | 'MEMBER';
  } | null;
}

export const BYPASS_PARTICIPANTS: readonly BypassParticipant[] = [
  {
    id: 'b1a55e55-0000-4000-8000-000000000001',
    email: 'lider.agro@demo.innlab.local',
    password: 'Agro-2026',
    firstName: 'Laura',
    lastName: 'Gómez',
    company: {
      id: 'c0a1b2c3-d4e5-4f60-8a71-9b8c7d6e5f01',
      name: 'AgroConecta (demo)',
      role: 'OWNER',
    },
  },
  {
    id: 'b1a55e55-0000-4000-8000-000000000002',
    email: 'lider.salud@demo.innlab.local',
    password: 'Salud-2026',
    firstName: 'Andrés',
    lastName: 'Ríos',
    company: {
      id: 'c0a1b2c3-d4e5-4f60-8a71-9b8c7d6e5f02',
      name: 'SaludVital (demo)',
      role: 'MEMBER',
    },
  },
  {
    id: 'b1a55e55-0000-4000-8000-000000000003',
    email: 'sin.empresa@demo.innlab.local',
    password: 'Camila-2026',
    firstName: 'Camila',
    lastName: 'Torres',
    company: null,
  },
  {
    id: 'b1a55e55-0000-4000-8000-000000000004',
    email: 'lider.edu@demo.innlab.local',
    password: 'Edu-2026',
    firstName: 'Valeria',
    lastName: 'Díaz',
    company: {
      id: 'c0a1b2c3-d4e5-4f60-8a71-9b8c7d6e5f04',
      name: 'EduAndes (demo)',
      role: 'OWNER',
    },
  },
  {
    id: 'b1a55e55-0000-4000-8000-000000000005',
    email: 'lider.logistica@demo.innlab.local',
    password: 'Logi-2026',
    firstName: 'Mateo',
    lastName: 'Cruz',
    company: {
      id: 'c0a1b2c3-d4e5-4f60-8a71-9b8c7d6e5f05',
      name: 'LogiSur (demo)',
      role: 'MEMBER',
    },
  },
];

export const BYPASS_USER_ID = BYPASS_PARTICIPANTS[0].id;

export function findBypassParticipant(userId: string): BypassParticipant | null {
  return BYPASS_PARTICIPANTS.find((person) => person.id === userId) ?? null;
}

export function findBypassParticipantByEmail(email: string): BypassParticipant | null {
  const normalized = email.trim().toLowerCase();
  return BYPASS_PARTICIPANTS.find((person) => person.email === normalized) ?? null;
}

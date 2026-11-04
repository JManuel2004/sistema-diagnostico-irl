import type { Initiative, InitiativeSummary, Sector, SectorOption } from '@innlab/contracts';

const CIIU = 'CIIU Rev. 5 A.C.';

/** A few sections of the catalog and «Otro», as `GET /initiative-catalog/sectors` serves them. */
export const SECTORS: SectorOption[] = [
  {
    id: '1',
    code: 'A',
    name: 'Agricultura, ganadería, caza, silvicultura y pesca',
    classification: CIIU,
    isOther: false,
    description:
      'Cultivos agrícolas, cría de animales, silvicultura y extracción de madera, pesca y acuicultura.',
    keywords: ['agro', 'cultivos', 'agritech'],
  },
  {
    id: '2',
    code: 'R',
    name: 'Actividades de atención de la salud humana y de asistencia social',
    classification: CIIU,
    isOther: false,
    description:
      'Hospitales, clínicas y consultorios, atención en residencias y asistencia social.',
    keywords: ['salud', 'clínica', 'healthtech'],
  },
  {
    id: '11',
    code: 'K',
    name: 'Telecomunicaciones, programación informática, consultoría, infraestructura informática y otras actividades de servicios de información',
    classification: CIIU,
    isOther: false,
    description:
      'Telecomunicaciones, programación y consultoría informática, procesamiento de datos, alojamiento web y otros servicios de información.',
    keywords: ['tecnología', 'software', 'aplicación'],
  },
  {
    id: '23',
    code: null,
    name: 'Otro sector (especificar)',
    classification: CIIU,
    isOther: true,
    description: 'Si ninguna sección representa tu actividad, descríbela con tus palabras.',
    keywords: ['otro'],
  },
];

/** A sector as a profile embeds it: without its search words. */
export function sectorOf(option: SectorOption): Sector {
  return {
    id: option.id,
    code: option.code,
    name: option.name,
    classification: option.classification,
    isOther: option.isOther,
  };
}

export const STAGES = [
  { id: '1', code: 'idea', name: 'Idea' },
  { id: '2', code: 'validacion', name: 'Validación' },
  { id: '3', code: 'crecimiento', name: 'Crecimiento' },
];

export const INITIATIVE_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

export function initiativeFixture(over: Partial<Initiative> = {}): Initiative {
  return {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    initiativeId: INITIATIVE_ID,
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'AgroConecta',
    sector: sectorOf(SECTORS[0]),
    customSector: null,
    productType: 'Aplicación web y módulo de trazabilidad',
    stage: STAGES[1],
    declaredStage: 'Piloto completado',
    teamSize: 3,
    teamDescription: 'Fundadora, coordinadora y desarrollador externo',
    targetMarket: 'Productores de café del suroccidente',
    currentFunding: 'Ahorros de la fundadora',
    recordedAt: '2026-05-10T15:00:00.000Z',
    ...over,
  };
}

/** An initiative of the user as `GET /initiatives` lists it. */
export function initiativeSummaryFixture(over: Partial<InitiativeSummary> = {}): InitiativeSummary {
  return {
    id: INITIATIVE_ID,
    createdAt: '2026-05-10T14:00:00.000Z',
    consent: { initiativeId: INITIATIVE_ID, version: 'v1', acceptedAt: '2026-05-10T14:00:00.000Z' },
    consentCurrent: true,
    latestProfile: initiativeFixture(),
    ...over,
  };
}

/** The consent text as `GET /consent-terms/current` serves it. */
export const CONSENT_TERMS = {
  version: 'v1',
  title: 'Autorización para el tratamiento de datos personales',
  sections: [
    {
      heading: 'Responsable del tratamiento',
      body: 'La Universidad Icesi, a través de INNLAB Centro de Innovación, es la responsable del tratamiento.',
    },
  ],
  checkboxLabel: 'He leído y acepto el tratamiento de mis datos personales según este texto.',
  publishedAt: '2026-09-20T00:00:00.000Z',
};

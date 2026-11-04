/**
 * Sectors of the initiative catalog (`irl_catalog.sector`).
 *
 * They are the 22 sections of the official Colombian classification of
 * economic activities: CIIU Rev. 5 adaptada para Colombia (CIIU Rev. 5 A.C.),
 * published by the DANE and established by Resolución 992 de 2026, which
 * repeals Resolución 2306 de 2022 (CIIU Rev. 4 A.C.). Codes and titles are
 * the DANE's, verbatim, as in its «Estructura detallada CIIU Rev. 5 A.C.»
 * (https://www.dane.gov.co/files/sen/nomenclatura/ciiu/CIIU_5_AC_Estructura_detallada.xlsx).
 *
 * `description` says in a line what a section groups, taken from its
 * official divisions: some titles do not say it («Otras actividades de
 * servicios» is associations, repairs and personal services, not a
 * catch-all). It is a summary for the form, not the DANE's text.
 *
 * `keywords` are not part of the classification: they are related words a
 * person may type to find a section in the registration form (a sector is
 * searched by its code, its title and these words). They describe the
 * section's activities, never a technology used by any activity: software
 * is section K only when developing it is the initiative's main activity
 * (see ADR 0019).
 *
 * The last entry, «Otro sector (especificar)», has no code: with it the
 * user describes their own sector in the profile (`custom_sector`).
 *
 * A sector that leaves this list is deactivated by the seed, not deleted:
 * the profiles already registered with it keep naming it.
 */
export const SECTOR_CLASSIFICATION = 'CIIU Rev. 5 A.C.';

export interface SectorSeed {
  /** Section code; null only for «Otro». */
  readonly code: string | null;
  readonly name: string;
  /** What the section groups, in a line; for «Otro», when to choose it. */
  readonly description: string;
  readonly keywords: readonly string[];
}

export const OTHER_SECTOR: SectorSeed = {
  code: null,
  name: 'Otro sector (especificar)',
  description:
    'Si ninguna sección representa tu actividad, descríbela con tus palabras.',
  keywords: ['otro', 'otra', 'ninguno', 'no aparece', 'especificar'],
};

export const SECTORS: readonly SectorSeed[] = [
  {
    code: 'A',
    name: 'Agricultura, ganadería, caza, silvicultura y pesca',
    description:
      'Cultivos agrícolas, cría de animales, silvicultura y extracción de madera, pesca y acuicultura.',
    keywords: [
      'agro',
      'agrícola',
      'cultivos',
      'cosechas',
      'café',
      'ganado',
      'pecuario',
      'forestal',
      'acuicultura',
      'agritech',
    ],
  },
  {
    code: 'B',
    name: 'Explotación de minas y canteras',
    description:
      'Extracción de carbón, petróleo, gas natural y minerales, y servicios de apoyo a la minería.',
    keywords: [
      'minería',
      'petróleo',
      'gas natural',
      'carbón',
      'extracción',
      'hidrocarburos',
    ],
  },
  {
    code: 'C',
    name: 'Industrias manufactureras',
    description:
      'Transformación de materiales en productos: alimentos y bebidas, textiles, químicos, medicamentos, electrónica, maquinaria y vehículos.',
    keywords: [
      'manufactura',
      'fábrica',
      'industria',
      'producción',
      'alimentos procesados',
      'textiles',
      'químicos',
      'farmacéutica',
      'dispositivos',
      'hardware',
    ],
  },
  {
    code: 'D',
    name: 'Suministro de electricidad, gas, vapor y aire acondicionado',
    description:
      'Generación, transmisión y distribución de energía eléctrica, y suministro de gas, vapor y aire acondicionado.',
    keywords: [
      'energía',
      'electricidad',
      'energía solar',
      'renovables',
      'eléctrica',
      'cleantech',
    ],
  },
  {
    code: 'E',
    name: 'Distribución de agua; evacuación y tratamiento de aguas residuales, gestión de residuos y actividades de saneamiento ambiental',
    description:
      'Captación y distribución de agua, tratamiento de aguas residuales, recolección y aprovechamiento de residuos, y saneamiento ambiental.',
    keywords: [
      'agua',
      'reciclaje',
      'residuos',
      'basuras',
      'saneamiento',
      'medio ambiente',
      'economía circular',
    ],
  },
  {
    code: 'F',
    name: 'Construcción',
    description:
      'Construcción de edificios y obras de ingeniería civil, e instalaciones, acabados y otros trabajos especializados.',
    keywords: [
      'obras',
      'edificación',
      'infraestructura',
      'vivienda',
      'ingeniería civil',
      'contech',
    ],
  },
  {
    code: 'G',
    name: 'Comercio al por mayor y al por menor',
    description:
      'Venta de toda clase de productos al por mayor y al por menor, y la intermediación en el comercio.',
    keywords: [
      'ventas',
      'tienda',
      'comercio electrónico',
      'ecommerce',
      'retail',
      'distribución',
      'mayorista',
      'minorista',
    ],
  },
  {
    code: 'H',
    name: 'Transporte y almacenamiento',
    description:
      'Transporte de pasajeros y de carga por tierra, agua o aire, almacenamiento, correo y mensajería.',
    keywords: [
      'logística',
      'movilidad',
      'envíos',
      'mensajería',
      'bodegas',
      'carga',
      'transporte',
    ],
  },
  {
    code: 'I',
    name: 'Actividades de alojamiento y de servicios de comidas',
    description:
      'Hoteles y otros alojamientos, restaurantes y servicios de comidas y bebidas.',
    keywords: [
      'turismo',
      'hotel',
      'hospedaje',
      'restaurante',
      'comida',
      'gastronomía',
      'alimentos',
    ],
  },
  {
    code: 'J',
    name: 'Actividades editoriales, de radiodifusión y de producción y distribución de contenidos',
    description:
      'Edición de libros, periódicos y software; producción de cine, video y música; radio, televisión y distribución de contenidos.',
    keywords: [
      'editorial',
      'publicaciones',
      'medios',
      'contenidos',
      'video',
      'cine',
      'música',
      'radio',
      'televisión',
      'videojuegos',
    ],
  },
  {
    code: 'K',
    name: 'Telecomunicaciones, programación informática, consultoría, infraestructura informática y otras actividades de servicios de información',
    description:
      'Telecomunicaciones, programación y consultoría informática, procesamiento de datos, alojamiento web y otros servicios de información.',
    keywords: [
      'tecnología',
      'software',
      'programación',
      'aplicación',
      'app',
      'plataforma digital',
      'informática',
      'tic',
      'telecomunicaciones',
      'nube',
      'datos',
      'inteligencia artificial',
    ],
  },
  {
    code: 'L',
    name: 'Actividades financieras y de seguros',
    description:
      'Bancos y otros servicios financieros, seguros, fondos de pensiones y actividades auxiliares de las finanzas.',
    keywords: [
      'finanzas',
      'financiero',
      'banca',
      'crédito',
      'pagos',
      'seguros',
      'inversión',
      'fintech',
    ],
  },
  {
    code: 'M',
    name: 'Actividades inmobiliarias',
    description: 'Compra, venta, arriendo y administración de inmuebles.',
    keywords: [
      'inmuebles',
      'finca raíz',
      'arriendo',
      'propiedad raíz',
      'proptech',
    ],
  },
  {
    code: 'N',
    name: 'Actividades profesionales, científicas y técnicas',
    description:
      'Servicios jurídicos y contables, consultoría de gestión, arquitectura e ingeniería, investigación científica, publicidad y veterinaria.',
    keywords: [
      'consultoría',
      'investigación',
      'ciencia',
      'laboratorio',
      'diseño',
      'ingeniería',
      'publicidad',
      'asesoría',
      'biotecnología',
      'veterinaria',
    ],
  },
  {
    code: 'O',
    name: 'Actividades de servicios administrativos y de apoyo',
    description:
      'Alquiler de bienes, agencias de empleo y de viajes, seguridad privada, limpieza de edificios, centros de llamadas y apoyo a empresas.',
    keywords: [
      'servicios empresariales',
      'outsourcing',
      'empleo',
      'seguridad privada',
      'limpieza',
      'agencia de viajes',
      'eventos',
    ],
  },
  {
    code: 'P',
    name: 'Administración pública y defensa; planes de seguridad social de afiliación obligatoria',
    description:
      'Entidades del Estado, defensa, orden público y planes de seguridad social obligatoria.',
    keywords: [
      'gobierno',
      'sector público',
      'estado',
      'entidad pública',
      'govtech',
    ],
  },
  {
    code: 'Q',
    name: 'Educación',
    description:
      'Enseñanza de todos los niveles, desde preescolar hasta la universidad, y otros tipos de formación.',
    keywords: [
      'enseñanza',
      'formación',
      'colegio',
      'universidad',
      'cursos',
      'capacitación',
      'edtech',
    ],
  },
  {
    code: 'R',
    name: 'Actividades de atención de la salud humana y de asistencia social',
    description:
      'Hospitales, clínicas y consultorios, atención en residencias y asistencia social.',
    keywords: [
      'salud',
      'médico',
      'clínica',
      'hospital',
      'bienestar',
      'asistencia social',
      'healthtech',
    ],
  },
  {
    code: 'S',
    name: 'Actividades artísticas, deportivas y recreativas',
    description:
      'Creación artística y artes escénicas, bibliotecas y museos, juegos de azar, deporte y recreación.',
    keywords: [
      'arte',
      'cultura',
      'deporte',
      'recreación',
      'entretenimiento',
      'museos',
      'industria creativa',
    ],
  },
  {
    code: 'T',
    name: 'Otras actividades de servicios',
    description:
      'Asociaciones y sindicatos, reparación de computadores, efectos personales y vehículos, y servicios personales como peluquería o lavandería.',
    keywords: [
      'servicios personales',
      'organizaciones',
      'asociaciones',
      'reparación',
      'belleza',
    ],
  },
  {
    code: 'U',
    name: 'Actividades de los hogares individuales en calidad de empleadores; actividades no diferenciadas de los hogares individuales como productores de bienes y servicios para uso propio',
    description:
      'Hogares que contratan personal doméstico y hogares que producen bienes y servicios para su propio consumo.',
    keywords: ['hogares', 'servicio doméstico', 'uso propio'],
  },
  {
    code: 'V',
    name: 'Actividades de organizaciones y entidades extraterritoriales',
    description:
      'Organismos internacionales y otras entidades extraterritoriales.',
    keywords: ['organismos internacionales', 'embajadas', 'extraterritorial'],
  },
];

// Import-time guard: the classification has exactly 22 sections, A to V.
if (
  SECTORS.length !== 22 ||
  SECTORS.some(
    (s, i) =>
      s.code !== String.fromCharCode(65 + i) ||
      s.name.length > 200 ||
      s.description.length > 160,
  )
) {
  throw new Error(
    'The sector catalog must hold the 22 CIIU Rev. 5 A.C. sections, A to V, in order',
  );
}

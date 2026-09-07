/**
 * Configuración inicial del motor de enrutamiento de portafolio.
 *
 * ⚠ TODOS ESTOS VALORES SON HIPOTÉTICOS Y PROVISIONALES.
 *
 * Provienen del documento de enfoques aplicado al caso AgroConecta, no de
 * INNLAB. El SRS (SA-03) declara que la tabla de enrutamiento real "debe
 * ser entregada por INNLAB antes del inicio de la implementación de
 * RF-15" y que "su ausencia bloquea ese módulo". Hasta que llegue, esta
 * configuración existe para que el sistema arranque con una versión
 * vigente y para que la prueba de aceptación tenga un caso reproducible.
 *
 * Antes de producción hay que reemplazar: los seis servicios, las 36
 * intensidades ordinales, los rangos de nivel, las etapas pertinentes,
 * los ocho pesos, y las reglas de elegibilidad y excepción. La estructura
 * puede quedarse; los números no.
 *
 * Se sigue el precedente de `statements.ts`, que se autodocumenta como
 * texto provisional pendiente de aprobación de stakeholders.
 */

// ─────────────────────────────────────────────────────────────────────────
// Servicios del portafolio
// ─────────────────────────────────────────────────────────────────────────
//
// Los seis que nombra el SRS en SA-02. Nótese que SA-03 lista solo cinco:
// omite "retos en el aula". La contradicción está en el SRS y no se
// resuelve aquí; se siembran los seis de SA-02 porque el caso los usa.

export interface ServicioSeed {
  readonly nombre: string;
  readonly descripcion: string;
}

export const SERVICIOS: readonly ServicioSeed[] = [
  {
    nombre: 'Formación',
    descripcion:
      'Programas formativos abiertos para cerrar vacíos de conocimiento del equipo.',
  },
  {
    nombre: 'Mentoría',
    descripcion:
      'Acompañamiento 1:1 con un mentor especializado en la dimensión más débil.',
  },
  {
    nombre: 'Consultoría',
    descripcion:
      'Asesoría experta focalizada en un frente concreto: legal, comercial o de modelo de negocio.',
  },
  {
    nombre: 'Retos en el Aula',
    descripcion:
      'Vinculación de la iniciativa a cursos de pregrado como reto real para estudiantes.',
  },
  {
    nombre: 'Proyectos Integradores',
    descripcion:
      'Desarrollo técnico guiado por equipos de estudiantes en proyectos de curso integrador.',
  },
  {
    nombre: 'Proyectos de Grado',
    descripcion:
      'Trabajo de grado dirigido sobre un problema específico de la iniciativa.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Etapas de iniciativa
// ─────────────────────────────────────────────────────────────────────────

export interface EtapaSeed {
  readonly codigo: string;
  readonly nombre: string;
  readonly orden: number;
}

export const ETAPAS: readonly EtapaSeed[] = [
  { codigo: 'idea', nombre: 'Idea', orden: 1 },
  { codigo: 'validacion', nombre: 'Validación', orden: 2 },
  { codigo: 'crecimiento', nombre: 'Crecimiento', orden: 3 },
];

// ─────────────────────────────────────────────────────────────────────────
// Escala de calibración
// ─────────────────────────────────────────────────────────────────────────
//
// `orden` expresa la monotonía: 1 es el peldaño más alto. Los valores
// deben ser estrictamente decrecientes en ese orden, invariante que
// comprueba `EscalaCalibracion.create()` porque es una propiedad del
// conjunto y ninguna restricción de fila puede expresarla.

export interface PeldanoSeed {
  readonly etiqueta: string;
  readonly valor: number;
  readonly orden: number;
}

export const ESCALA_CALIBRACION: readonly PeldanoSeed[] = [
  { etiqueta: 'principal', valor: 1.0, orden: 1 },
  { etiqueta: 'secundario', valor: 0.5, orden: 2 },
  { etiqueta: 'marginal', valor: 0.2, orden: 3 },
  { etiqueta: 'no_aplica', valor: 0.0, orden: 4 },
];

// ─────────────────────────────────────────────────────────────────────────
// Pesos globales
// ─────────────────────────────────────────────────────────────────────────

export const PARAMETROS_SCORING = {
  /** El problema más agudo pesa el triple que una brecha ordinaria. */
  pesoCuelloBotella: 3.0,
  /** Cada dimensión en brecha suma proporcionalmente a la intensidad. */
  pesoBrecha: 1.5,
  /** Desequilibrios de 2–3 niveles: desalineación, no bloqueo. */
  pesoDesequilibrioModerado: 0.5,
  /** Desequilibrios de más de 3 niveles: bloquean el avance. */
  pesoDesequilibrioCritico: 1.0,
  /** La etapa refina la recomendación, no la decide. */
  pesoAfinidadEtapa: 0.8,
  /** Operar fuera de la banda de madurez del servicio cuesta 2 puntos. */
  penalizacionFueraRango: 2.0,
  /** Por debajo de esto, el sistema prefiere no recomendar. */
  umbralMinimo: 2.5,
  /** Cuántas alternativas acompañan a la recomendación principal. */
  nAlternativas: 2,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Fichas ordinales — 6 servicios × 6 dimensiones
// ─────────────────────────────────────────────────────────────────────────

export type EtiquetaOrdinal =
  | 'principal'
  | 'secundario'
  | 'marginal'
  | 'no_aplica';

export interface FichaSeed {
  readonly servicio: string;
  readonly nivelMin: number;
  readonly nivelMax: number;
  readonly etapasPertinentes: readonly string[];
  readonly intensidades: Readonly<Record<string, EtiquetaOrdinal>>;
}

export const FICHAS: readonly FichaSeed[] = [
  {
    servicio: 'Formación',
    nivelMin: 1,
    nivelMax: 5,
    etapasPertinentes: ['idea', 'validacion'],
    intensidades: {
      TRL: 'marginal',
      CRL: 'secundario',
      BRL: 'secundario',
      IPRL: 'no_aplica',
      TmRL: 'principal',
      FRL: 'no_aplica',
    },
  },
  {
    servicio: 'Mentoría',
    nivelMin: 1,
    nivelMax: 6,
    etapasPertinentes: ['idea', 'validacion'],
    intensidades: {
      TRL: 'no_aplica',
      CRL: 'principal',
      BRL: 'secundario',
      IPRL: 'no_aplica',
      TmRL: 'principal',
      FRL: 'secundario',
    },
  },
  {
    // Rango alto: la asesoría estratégica requiere cierta madurez previa
    // para ser útil.
    servicio: 'Consultoría',
    nivelMin: 4,
    nivelMax: 9,
    etapasPertinentes: ['validacion', 'crecimiento'],
    intensidades: {
      TRL: 'no_aplica',
      CRL: 'principal',
      BRL: 'principal',
      IPRL: 'secundario',
      TmRL: 'no_aplica',
      FRL: 'secundario',
    },
  },
  {
    servicio: 'Retos en el Aula',
    nivelMin: 2,
    nivelMax: 8,
    etapasPertinentes: ['validacion', 'crecimiento'],
    intensidades: {
      TRL: 'secundario',
      CRL: 'secundario',
      BRL: 'secundario',
      IPRL: 'no_aplica',
      TmRL: 'marginal',
      FRL: 'no_aplica',
    },
  },
  {
    // Más apropiados temprano, cuando la iniciativa aún necesita
    // desarrollo técnico guiado.
    servicio: 'Proyectos Integradores',
    nivelMin: 1,
    nivelMax: 5,
    etapasPertinentes: ['idea', 'validacion'],
    intensidades: {
      TRL: 'principal',
      CRL: 'no_aplica',
      BRL: 'no_aplica',
      IPRL: 'no_aplica',
      TmRL: 'secundario',
      FRL: 'no_aplica',
    },
  },
  {
    // Cubren casi todo el rango porque se adaptan: investigación
    // temprana, validación de viabilidad o aceleración.
    servicio: 'Proyectos de Grado',
    nivelMin: 1,
    nivelMax: 7,
    etapasPertinentes: ['idea', 'validacion', 'crecimiento'],
    intensidades: {
      TRL: 'no_aplica',
      CRL: 'marginal',
      BRL: 'no_aplica',
      IPRL: 'no_aplica',
      TmRL: 'principal',
      FRL: 'no_aplica',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Capa 1 — reglas de elegibilidad (booleanas puras)
// ─────────────────────────────────────────────────────────────────────────
//
// Expresan imposibilidad, no preferencia. Por eso no pueden comparar
// `nivelPromedio` ni magnitudes: el compilador en modo BOOLEANO rechaza
// los operadores de orden, así que una condición de grado no puede
// colarse a este filtro ni por descuido.

export interface ReglaElegibilidadSeed {
  readonly codigo: string;
  readonly servicio: string;
  readonly predicado: unknown;
  readonly mensajeExclusion: string;
}

export const REGLAS_ELEGIBILIDAD: readonly ReglaElegibilidadSeed[] = [
  {
    codigo: 'ELG-01',
    servicio: 'Proyectos de Grado',
    predicado: {
      campo: 'caracterizacion.vinculacionAcademica',
      op: '=',
      valor: false,
    },
    mensajeExclusion:
      'Proyectos de Grado requieren vinculación académica confirmada con la universidad.',
  },
  {
    codigo: 'ELG-02',
    servicio: 'Retos en el Aula',
    predicado: { campo: 'caracterizacion.tamanoEquipo', op: '=', valor: 1 },
    mensajeExclusion:
      'Retos en el Aula requiere al menos 2 personas en el equipo para dinámicas colaborativas.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Capa 3 — ajustes puntuales
// ─────────────────────────────────────────────────────────────────────────
//
// El orden importa y es total: `prioridadOrden` es único dentro de una
// versión por restricción de base de datos. E-01 se evalúa primero y
// puede forzar un servicio al puesto 1; E-02 y E-03 siguen evaluándose
// después, pero sobre el ranking que E-01 ya dejó.

export interface ReglaExcepcionSeed {
  readonly codigo: string;
  readonly prioridadOrden: number;
  readonly predicado: unknown;
  readonly accion: 'FORZAR' | 'VETAR' | 'PROMOVER' | 'DEGRADAR';
  readonly servicioObjetivo: string;
  readonly posiciones: number | null;
  readonly motivoDeclarado: string;
}

export const REGLAS_EXCEPCION: readonly ReglaExcepcionSeed[] = [
  {
    codigo: 'E-01',
    prioridadOrden: 1,
    predicado: {
      op: 'y',
      operandos: [
        { campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' },
        { campo: 'desequilibriosCriticos', op: 'contiene', valor: 'TRL-IPRL' },
      ],
    },
    accion: 'FORZAR',
    servicioObjetivo: 'Consultoría',
    posiciones: null,
    motivoDeclarado:
      'Un riesgo legal crítico en paralelo con desequilibrio tecnológico requiere ' +
      'asesoría legal especializada como primer paso, antes de cualquier intervención ' +
      'de otra naturaleza.',
  },
  {
    codigo: 'E-02',
    prioridadOrden: 2,
    predicado: {
      op: 'y',
      operandos: [
        { campo: 'brechas', op: 'conteo>=', valor: 3 },
        {
          op: 'no',
          operandos: [
            { campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' },
          ],
        },
      ],
    },
    accion: 'PROMOVER',
    servicioObjetivo: 'Retos en el Aula',
    posiciones: 2,
    motivoDeclarado:
      'Un perfil débil de forma generalizada en múltiples dimensiones se beneficia de ' +
      'exposición amplia a estudiantes; pero cede ante urgencias legales o técnicas puntuales.',
  },
  {
    codigo: 'E-03',
    prioridadOrden: 3,
    predicado: {
      op: 'y',
      operandos: [
        { campo: 'desequilibriosCriticos', op: 'contiene', valor: 'CRL-BRL' },
        { campo: 'nivelPromedio', op: '<', valor: 3 },
      ],
    },
    accion: 'PROMOVER',
    servicioObjetivo: 'Mentoría',
    posiciones: 1,
    motivoDeclarado:
      'Cuando la separación cliente-modelo es crítica en una iniciativa muy temprana, ' +
      'mentoría 1:1 abre el diálogo antes que servicios masivos.',
  },
];

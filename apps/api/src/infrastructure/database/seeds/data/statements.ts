import { DIMENSIONS } from './dimensions.js';

/**
 * Forty-eight statements (afirmaciones) of the IRL questionnaire — 8 per
 * dimension, 6 dimensions, total 48 (RF-05).
 *
 * IMPORTANT: the Spanish text below is **placeholder** representative of
 * the KTH Innovation Readiness Level framework. Before going to
 * production, replace it with the project-stakeholder-approved wording
 * referenced in `sistema-diagnostico-irl-docs/01-requirements/backlog.md`.
 * Replace the text only — never change the `orden`, the dimension
 * mapping, or the count of 8 per dimension.
 *
 * The deterministic UUIDs (`22222222-XX-YY-...`) make integration tests
 * reproducible: XX is the dimension index (01-06) and YY is the
 * statement index within the dimension (01-08).
 */
export interface StatementSeed {
  readonly id: string;
  readonly dimensionId: string;
  readonly orden: number;
  readonly texto: string;
}

const DIM = Object.fromEntries(DIMENSIONS.map((d) => [d.codigo, d.id]));

const statementId = (dimensionIndex: number, orden: number): string =>
  `22222222-2222-2222-${String(dimensionIndex).padStart(4, '0')}-${String(orden).padStart(12, '0')}`;

const TRL_TEXTS: readonly string[] = [
  'Hemos identificado y descrito los principios tecnológicos básicos sobre los que se apoya la iniciativa.',
  'Hemos formulado el concepto tecnológico y posibles aplicaciones de la solución.',
  'Hemos validado experimentalmente componentes individuales de la tecnología en condiciones de laboratorio.',
  'Hemos integrado los componentes en un prototipo funcional probado en entorno controlado.',
  'Hemos validado el prototipo en un entorno representativo del uso real.',
  'Hemos demostrado la tecnología en un entorno operativo con un piloto representativo.',
  'Hemos completado pruebas en condiciones reales con usuarios o clientes seleccionados.',
  'La tecnología está madura y desplegada en producción para uso continuo de clientes.',
];

const CRL_TEXTS: readonly string[] = [
  'Hemos identificado un problema concreto que afecta a un grupo de personas o empresas.',
  'Hemos caracterizado al cliente potencial y la situación en la que enfrenta el problema.',
  'Hemos validado la existencia del problema con entrevistas o evidencia cuantitativa.',
  'Hemos confirmado que la propuesta de valor resuelve un problema importante para el cliente.',
  'Hemos validado disposición a usar o adquirir la solución con clientes representativos.',
  'Tenemos clientes piloto que utilizan la solución y proporcionan retroalimentación periódica.',
  'Tenemos clientes que pagan por la solución bajo condiciones cercanas a las del mercado objetivo.',
  'Tenemos una base de clientes sostenida y procesos repetibles de adquisición.',
];

const BRL_TEXTS: readonly string[] = [
  'Hemos identificado posibles vías para crear y capturar valor con la iniciativa.',
  'Hemos esbozado una propuesta de valor diferenciada frente a alternativas existentes.',
  'Hemos diseñado un modelo de negocio inicial con sus componentes principales.',
  'Hemos validado los supuestos críticos del modelo con datos de campo.',
  'Hemos puesto a prueba el modelo en una operación piloto y aprendido de los resultados.',
  'Hemos refinado el modelo con base en la operación piloto y datos económicos reales.',
  'El modelo de negocio opera con métricas estables que demuestran sostenibilidad.',
  'El modelo de negocio es escalable y replicable en nuevos segmentos o geografías.',
];

const IPRL_TEXTS: readonly string[] = [
  'Hemos identificado los activos de propiedad intelectual relevantes para la iniciativa.',
  'Conocemos el estado del arte y las patentes/registros vigentes en el área.',
  'Hemos definido una estrategia inicial de protección y manejo del know-how.',
  'Tenemos acuerdos de confidencialidad y cesión de derechos con el equipo y aliados.',
  'Tenemos solicitudes formales de protección presentadas (patente, software, marca u otra).',
  'Hemos obtenido al menos un registro o concesión formal de protección de PI.',
  'Tenemos una cartera de PI defensiva alineada con la estrategia comercial.',
  'La cartera de PI genera valor económico (licenciamiento, ventaja competitiva sostenida).',
];

const TmRL_TEXTS: readonly string[] = [
  'Existe un líder identificable comprometido con el avance de la iniciativa.',
  'El equipo cubre las competencias técnicas básicas necesarias para la fase actual.',
  'El equipo combina perfiles complementarios (técnico, comercial, operativo).',
  'Los roles están definidos y hay claridad sobre responsabilidades.',
  'El equipo tiene dedicación suficiente para sostener el ritmo de la iniciativa.',
  'El equipo cuenta con mentores o asesores externos vinculados de forma activa.',
  'El equipo demuestra capacidad para ejecutar bajo presión y adaptarse a cambios.',
  'El equipo opera de forma autónoma con procesos definidos y resultados sostenidos.',
];

const FRL_TEXTS: readonly string[] = [
  'Hemos estimado los costos iniciales para validar la propuesta.',
  'Tenemos un plan financiero con los hitos de inversión necesarios para la fase actual.',
  'Hemos identificado fuentes de financiación pertinentes a la fase de la iniciativa.',
  'Hemos asegurado financiación inicial (propia, capital semilla, convocatoria u otra).',
  'Disponemos de runway suficiente para alcanzar los siguientes hitos críticos.',
  'Hemos cerrado una ronda de financiación dimensionada para escalar.',
  'Generamos ingresos operativos que cubren una parte significativa de los costos.',
  'La iniciativa es financieramente sostenible y/o ha alcanzado eventos de liquidez.',
];

const TEXTS_BY_CODE: Record<string, readonly string[]> = {
  TRL: TRL_TEXTS,
  CRL: CRL_TEXTS,
  BRL: BRL_TEXTS,
  IPRL: IPRL_TEXTS,
  TmRL: TmRL_TEXTS,
  FRL: FRL_TEXTS,
};

export const STATEMENTS: readonly StatementSeed[] = DIMENSIONS.flatMap((d) => {
  const texts = TEXTS_BY_CODE[d.codigo];
  if (texts?.length !== 8) {
    throw new Error(
      `Dimension ${d.codigo} must have exactly 8 statement texts`,
    );
  }
  return texts.map((texto, index) => ({
    id: statementId(d.orden, index + 1),
    dimensionId: DIM[d.codigo],
    orden: index + 1,
    texto,
  }));
});

if (STATEMENTS.length !== 48) {
  throw new Error(
    `Expected exactly 48 statements; computed ${STATEMENTS.length}`,
  );
}

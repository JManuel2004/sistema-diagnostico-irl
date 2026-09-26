/**
 * Technical terms of the IRL framework with their explanation in plain
 * language, one sentence each. They are text for someone who has never
 * heard of IRL, not the backend's technical definition: what the word means
 * for the initiative.
 *
 * Dimension names are not here: they come from the responses.
 */
export const GLOSSARY = {
  bottleneck: {
    term: 'Cuello de botella',
    explanation:
      'La dimensión donde tu iniciativa está menos avanzada: es la que más frena el avance del conjunto.',
  },
  gap: {
    term: 'Brecha',
    explanation:
      'Una dimensión que está en la parte más baja de la escala: todavía es muy incipiente y conviene atenderla primero.',
  },
  imbalance: {
    term: 'Desequilibrio',
    explanation:
      'Cuando dos dimensiones que deberían avanzar juntas tienen niveles muy distintos, por ejemplo, tener el producto listo pero casi ningún cliente.',
  },
  criticalState: {
    term: 'Estado crítico',
    explanation:
      'Una brecha en una dimensión clave del marco: mientras siga así, avanzar en lo demás rinde poco.',
  },
  asymmetry: {
    term: 'Asimetría',
    explanation:
      'La distancia entre tu dimensión más avanzada y la menos avanzada: entre más grande, más despareja va la iniciativa.',
  },
  strength: {
    term: 'Fortaleza',
    explanation: 'La dimensión donde tu iniciativa está más avanzada.',
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

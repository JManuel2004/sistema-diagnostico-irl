/**
 * Technical terms of the IRL framework with their explanation in plain
 * language, one sentence each. They are text for someone who has never
 * heard of IRL, not the backend's technical definition: what the word means
 * for the initiative.
 *
 * Each one also says, in `forYou`, what it implies for the user's
 * initiative: the definition alone said what the word is, not what it means
 * for them (usability test P05).
 *
 * Dimension names are not here: they come from the responses.
 */
export const GLOSSARY = {
  bottleneck: {
    term: 'Cuello de botella',
    explanation:
      'La dimensión donde tu iniciativa está menos avanzada: es la que más frena el avance del conjunto.',
    forYou: 'Es la primera que conviene fortalecer.',
  },
  gap: {
    term: 'Dimensión de cuidado',
    explanation:
      'Una dimensión que está en la parte más baja de la escala: todavía es muy incipiente y conviene atenderla primero.',
    forYou: 'Mientras siga así, limita lo que puedes lograr en las demás.',
  },
  imbalance: {
    term: 'Desequilibrio',
    explanation:
      'Cuando dos dimensiones que deberían avanzar juntas tienen niveles muy distintos, por ejemplo, tener el producto listo pero casi ningún cliente.',
    forYou: 'Conviene acercar la que va atrás antes de seguir subiendo la que va adelante.',
  },
  criticalState: {
    term: 'Estado crítico',
    explanation:
      'Una dimensión clave del marco que está en la parte más baja de la escala.',
    forYou: 'Mientras siga así, avanzar en lo demás rinde poco.',
  },
  asymmetry: {
    term: 'Asimetría',
    explanation:
      'La diferencia entre la calificación de tu dimensión más alta y la de la más baja.',
    forYou: 'Entre más grande, menos equilibrado es el avance de tu iniciativa.',
  },
  strength: {
    term: 'Fortaleza',
    explanation: 'La dimensión donde tu iniciativa está más avanzada.',
    forYou: 'Es una base en la que puedes apoyarte para subir las demás.',
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

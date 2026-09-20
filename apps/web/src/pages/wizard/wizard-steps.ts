/**
 * Los pasos del asistente de diagnóstico y las reglas de en cuál se puede estar.
 *
 * El orden es el que ve el usuario: iniciativa, consentimiento, cuestionario y
 * resumen. Que el consentimiento vaya después de la iniciativa no cambia cuándo
 * se guarda cada cosa: el sistema no guarda la iniciativa hasta que el
 * consentimiento está aceptado (RF-03, RNF-06); hasta entonces el formulario
 * es un borrador del navegador.
 */
export const WIZARD_STEP_KEYS = ['iniciativa', 'consentimiento', 'cuestionario', 'resumen'] as const;

export type WizardStepKey = (typeof WIZARD_STEP_KEYS)[number];

export const WIZARD_STEP_LABELS: Record<WizardStepKey, string> = {
  iniciativa: 'Iniciativa',
  consentimiento: 'Consentimiento',
  cuestionario: 'Cuestionario',
  resumen: 'Resumen',
};

export function isWizardStep(value: string | undefined): value is WizardStepKey {
  return WIZARD_STEP_KEYS.some((key) => key === value);
}

export function wizardPath(diagnosticId: string, step?: WizardStepKey): string {
  const base = `/diagnosticos/${diagnosticId}/asistente`;
  return step === undefined ? base : `${base}/${step}`;
}

export interface WizardProgress {
  /** La iniciativa ya está registrada, o su borrador está listo en el navegador. */
  readonly initiativeReady: boolean;
  /** El consentimiento está aceptado **y** la iniciativa ya está registrada en el servidor. */
  readonly consentDone: boolean;
}

/**
 * El primer paso que falta. El resumen nunca es «el que falta»: se llega a él
 * desde el cuestionario, y el cuestionario decide si está completo.
 */
export function firstPendingStep({ initiativeReady, consentDone }: WizardProgress): WizardStepKey {
  if (!initiativeReady) return 'iniciativa';
  if (!consentDone) return 'consentimiento';
  return 'cuestionario';
}

/**
 * Se puede estar en un paso si no está más allá del primero que falta. El
 * resumen cuenta como alcanzable cuando solo falta el cuestionario: es él
 * quien devuelve al usuario si las respuestas no están completas.
 */
export function isReachable(step: WizardStepKey, pending: WizardStepKey): boolean {
  if (step === 'resumen') return pending === 'cuestionario';
  return WIZARD_STEP_KEYS.indexOf(step) <= WIZARD_STEP_KEYS.indexOf(pending);
}

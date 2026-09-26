/**
 * The steps of the diagnostic wizard and the rules for which one the user
 * may be on.
 *
 * The order is the one the user sees: initiative, consent, questionnaire
 * and summary. The consent coming after the initiative does not change when
 * each thing is stored: the system does not store the initiative until the
 * consent is accepted (RF-03, RNF-06); until then the form is a browser
 * draft.
 */
import { paths } from '@/shared/lib/paths';

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
  return paths.wizard(diagnosticId, step);
}

export interface WizardProgress {
  /** The initiative is already registered, or its draft is ready in the browser. */
  readonly initiativeReady: boolean;
  /** The consent is accepted **and** the initiative is registered on the server. */
  readonly consentDone: boolean;
}

/**
 * The first missing step. The summary is never "the missing one": it is
 * reached from the questionnaire, and the questionnaire decides whether it
 * is complete.
 */
export function firstPendingStep({ initiativeReady, consentDone }: WizardProgress): WizardStepKey {
  if (!initiativeReady) return 'iniciativa';
  if (!consentDone) return 'consentimiento';
  return 'cuestionario';
}

/**
 * A step may be open if it is not beyond the first missing one. The
 * summary counts as reachable when only the questionnaire is missing: the
 * questionnaire is what sends the user back if the answers are incomplete.
 */
export function isReachable(step: WizardStepKey, pending: WizardStepKey): boolean {
  if (step === 'resumen') return pending === 'cuestionario';
  return WIZARD_STEP_KEYS.indexOf(step) <= WIZARD_STEP_KEYS.indexOf(pending);
}

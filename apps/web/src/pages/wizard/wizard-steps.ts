/**
 * The steps of the diagnostic wizard and the rules for which one the user
 * may be on.
 *
 * The order is the one the user sees: consent, initiative, questionnaire
 * and summary. The consent is accepted before any initiative data is asked
 * for (RF-03, RNF-06). The acceptance is recorded when they choose or
 * create the initiative on the next step.
 */
import { paths } from '@/shared/lib/paths';

export const WIZARD_STEP_KEYS = ['consentimiento', 'iniciativa', 'cuestionario', 'resumen'] as const;

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
  /** The current consent text was accepted, or the initiative is already registered. */
  readonly consentAccepted: boolean;
  /** The initiative profile is registered for this diagnostic. */
  readonly initiativeRegistered: boolean;
}

/**
 * The first missing step. The summary is never "the missing one": it is
 * reached from the questionnaire, and the questionnaire decides whether it
 * is complete.
 */
export function firstPendingStep({
  consentAccepted,
  initiativeRegistered,
}: WizardProgress): WizardStepKey {
  if (!consentAccepted) return 'consentimiento';
  if (!initiativeRegistered) return 'iniciativa';
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

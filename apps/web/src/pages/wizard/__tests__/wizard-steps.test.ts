import { describe, expect, it } from 'vitest';
import {
  WIZARD_STEP_KEYS,
  firstPendingStep,
  isReachable,
  isWizardStep,
  wizardPath,
} from '../wizard-steps';

describe('wizard-steps', () => {
  it('los pasos van en el orden que ve el usuario: consentimiento, iniciativa, cuestionario y resumen', () => {
    expect([...WIZARD_STEP_KEYS]).toEqual([
      'consentimiento',
      'iniciativa',
      'cuestionario',
      'resumen',
    ]);
  });

  it('reconoce solo los pasos del asistente', () => {
    expect(isWizardStep('resumen')).toBe(true);
    expect(isWizardStep('resultados')).toBe(false);
    expect(isWizardStep(undefined)).toBe(false);
  });

  it('arma la ruta de un paso, o la del asistente sin paso', () => {
    expect(wizardPath('abc', 'consentimiento')).toBe('/diagnosticos/abc/asistente/consentimiento');
    expect(wizardPath('abc')).toBe('/diagnosticos/abc/asistente');
  });

  describe('firstPendingStep', () => {
    it.each([
      [{ consentAccepted: false, initiativeRegistered: false }, 'consentimiento'],
      [{ consentAccepted: true, initiativeRegistered: false }, 'iniciativa'],
      [{ consentAccepted: true, initiativeRegistered: true }, 'cuestionario'],
    ] as const)('%j → %s', (progress, expected) => {
      expect(firstPendingStep(progress)).toBe(expected);
    });

    it('nunca devuelve el resumen: se llega a él desde el cuestionario', () => {
      expect(
        firstPendingStep({ consentAccepted: true, initiativeRegistered: true }),
      ).not.toBe('resumen');
    });
  });

  describe('isReachable', () => {
    it.each([
      ['consentimiento', 'consentimiento', true],
      ['iniciativa', 'consentimiento', false],
      ['cuestionario', 'consentimiento', false],
      ['consentimiento', 'iniciativa', true],
      ['iniciativa', 'iniciativa', true],
      ['cuestionario', 'iniciativa', false],
      ['consentimiento', 'cuestionario', true],
      ['iniciativa', 'cuestionario', true],
      ['cuestionario', 'cuestionario', true],
    ] as const)('el paso %s con «%s» pendiente: %s', (step, pending, expected) => {
      expect(isReachable(step, pending)).toBe(expected);
    });

    it('el resumen se alcanza solo cuando lo único que falta es el cuestionario', () => {
      expect(isReachable('resumen', 'cuestionario')).toBe(true);
      expect(isReachable('resumen', 'iniciativa')).toBe(false);
      expect(isReachable('resumen', 'consentimiento')).toBe(false);
    });
  });
});

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { DimensionWithStatements } from '@innlab/contracts';

/**
 * Development-only autofill.
 *
 * The switch is a **build-time** variable, `VITE_DEV_AUTOFILL`, set to `true`
 * only in `.env.development` (loaded by `vite` in dev mode, never by
 * `vite build`). In a production build Vite replaces
 * `import.meta.env.VITE_DEV_AUTOFILL` with `undefined`, the comparison below
 * is statically false, and the dynamic imports are removed from the bundle
 * together with the AgroConecta data — it is not a runtime branch that could
 * be flipped by accident. `test/dev-autofill-bundle` checks the built output.
 */
export const DEV_AUTOFILL_ENABLED: boolean = import.meta.env.VITE_DEV_AUTOFILL === 'true';

export interface QuestionnaireAutofillProps {
  /** The catalog, to find each statement id from its dimension and sequence. */
  readonly dimensions: readonly DimensionWithStatements[];
}

/** Fills the 48 answers and their justifications. Undefined outside development. */
export const QuestionnaireAutofill: LazyExoticComponent<
  ComponentType<QuestionnaireAutofillProps>
> | null =
  import.meta.env.VITE_DEV_AUTOFILL === 'true'
    ? lazy(() => import('./QuestionnaireAutofill'))
    : null;

/** The form values the initiative autofill produces (the form keeps text inputs). */
export interface InitiativeAutofillValues {
  readonly name: string;
  readonly sectorId: string;
  readonly productType: string;
  readonly stageId: string;
  readonly declaredStage: string;
  readonly teamSize: string;
  readonly teamDescription: string;
  readonly academicLinkage: 'true' | 'false';
  readonly targetMarket: string;
  readonly currentFunding: string;
}

export interface InitiativeAutofillProps {
  readonly onFill: (values: InitiativeAutofillValues) => void;
  readonly sectors: readonly { id: string; name: string }[];
  readonly stages: readonly { id: string; code: string }[];
}

/** Fills the initiative profile. Undefined outside development. */
export const InitiativeAutofill: LazyExoticComponent<
  ComponentType<InitiativeAutofillProps>
> | null =
  import.meta.env.VITE_DEV_AUTOFILL === 'true' ? lazy(() => import('./InitiativeAutofill')) : null;

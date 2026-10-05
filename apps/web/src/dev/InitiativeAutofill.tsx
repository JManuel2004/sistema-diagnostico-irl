import type { JSX } from 'react';
import { Button } from '@/shared/ui/button';
import { AGROCONECTA_INITIATIVE } from './agroconecta-case';
import type { InitiativeAutofillProps } from './dev-autofill';

/** Development only: fills the initiative form with the AgroConecta profile. */
export default function InitiativeAutofill({
  onFill,
  sectors,
  stages,
}: InitiativeAutofillProps): JSX.Element {
  function handleFill(): void {
    onFill({
      name: AGROCONECTA_INITIATIVE.name,
      sectorId: sectors.find((s) => s.name === AGROCONECTA_INITIATIVE.sectorName)?.id ?? '',
      productType: AGROCONECTA_INITIATIVE.productType,
      stageId: stages.find((s) => s.code === AGROCONECTA_INITIATIVE.stageCode)?.id ?? '',
      declaredStage: AGROCONECTA_INITIATIVE.declaredStage,
      teamSize: String(AGROCONECTA_INITIATIVE.teamSize),
      teamDescription: AGROCONECTA_INITIATIVE.teamDescription,
      targetMarket: AGROCONECTA_INITIATIVE.targetMarket,
      currentFunding: AGROCONECTA_INITIATIVE.currentFunding,
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleFill} data-testid="dev-autofill-initiative">
      Autocompletar con AgroConecta (solo desarrollo)
    </Button>
  );
}

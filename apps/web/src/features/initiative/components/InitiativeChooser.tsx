import { useId, type JSX } from 'react';
import type { InitiativeSummary } from '@innlab/contracts';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { formatDateTime } from '@/shared/lib/format';

/** The value of the «Nueva iniciativa» option. */
export const NEW_INITIATIVE = 'new';

interface Props {
  readonly initiatives: readonly InitiativeSummary[];
  /** The chosen initiative's id, or `NEW_INITIATIVE`. */
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * Which initiative a diagnostic is about: one the user already has — its
 * latest profile fills the form — or a new one. Each option names the
 * initiative by its latest profile.
 */
export function InitiativeChooser({ initiatives, value, onChange }: Props): JSX.Element {
  const labelId = useId();

  return (
    <fieldset className="mb-8 flex flex-col gap-3">
      <legend id={labelId} className="text-foreground mb-3 text-base font-semibold">
        ¿Sobre qué iniciativa es este diagnóstico?
      </legend>
      <RadioGroup aria-labelledby={labelId} value={value} onValueChange={onChange}>
        {initiatives.map((initiative) => {
          const optionId = `${labelId}-${initiative.id}`;
          return (
            <div key={initiative.id} className="flex items-start gap-3">
              <RadioGroupItem id={optionId} value={initiative.id} className="mt-1" />
              <label htmlFor={optionId} className="cursor-pointer text-sm">
                <span className="text-foreground font-medium">
                  {initiative.latestProfile?.name ?? 'Iniciativa sin información registrada'}
                </span>
                <span className="text-muted-foreground block">
                  {initiative.latestProfile
                    ? `Última actualización: ${formatDateTime(initiative.latestProfile.recordedAt)}`
                    : `Creada el ${formatDateTime(initiative.createdAt)}`}
                </span>
              </label>
            </div>
          );
        })}
        <div className="flex items-start gap-3">
          <RadioGroupItem id={`${labelId}-new`} value={NEW_INITIATIVE} className="mt-1" />
          <label htmlFor={`${labelId}-new`} className="text-foreground cursor-pointer text-sm font-medium">
            Nueva iniciativa
          </label>
        </div>
      </RadioGroup>
    </fieldset>
  );
}

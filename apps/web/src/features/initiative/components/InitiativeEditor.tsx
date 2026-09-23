import type { JSX } from 'react';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { RETRY_LATER } from '@/shared/lib/copy';
import { useSectors, useStages } from '../hooks/useInitiative';
import { InitiativeForm, type InitiativeFormProps } from './InitiativeForm';

type Props = Omit<InitiativeFormProps, 'sectors' | 'stages'> & {
  /** Remounts the form when the initiative it edits changes. */
  readonly formKey: string;
};

/**
 * The initiative form with the sector and stage catalogs it needs. The
 * wizard's first step and the correction screen show the same form; this is
 * the one place that loads its catalogs and says when they fail.
 */
export function InitiativeEditor({ formKey, ...formProps }: Props): JSX.Element {
  const sectors = useSectors();
  const stages = useStages();

  if (sectors.isPending || stages.isPending) return <LoadingState label="Cargando…" />;

  if (sectors.isError || stages.isError) {
    return (
      <Alert tone="critical" title="No fue posible cargar el formulario">
        {RETRY_LATER}
      </Alert>
    );
  }

  return (
    <InitiativeForm key={formKey} sectors={sectors.data} stages={stages.data} {...formProps} />
  );
}

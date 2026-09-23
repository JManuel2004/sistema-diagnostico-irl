import type { JSX, ReactNode } from 'react';
import { Milestone, Package, Target, Users, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Initiative } from '@innlab/contracts';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';

/**
 * The initiative as it was registered: the summary shown in the panel and
 * before processing the diagnostic.
 *
 * It opens with its name and its sector and goes down to the rest in blocks
 * with their icon, at reading size: it is what the user said about
 * themselves and they must be able to reread it at a glance, not decode it
 * from a definition list.
 */
interface Props {
  readonly initiative: Initiative;
  /** To the right of the name: e.g. the link to correct it. */
  readonly action?: ReactNode;
}

interface Row {
  readonly label: string;
  readonly value: string;
  readonly icon: LucideIcon;
}

export function InitiativeSummary({ initiative, action }: Props): JSX.Element {
  const rows: readonly Row[] = [
    { label: 'Qué ofrece', value: initiative.productType, icon: Package },
    {
      label: 'Etapa',
      value: `${initiative.stage.name} — ${initiative.declaredStage}`,
      icon: Milestone,
    },
    {
      label: 'Equipo',
      value: `${String(initiative.teamSize)} ${initiative.teamSize === 1 ? 'persona' : 'personas'} — ${initiative.teamDescription}`,
      icon: Users,
    },
    { label: 'Mercado objetivo', value: initiative.targetMarket, icon: Target },
    { label: 'Financiamiento actual', value: initiative.currentFunding, icon: Wallet },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b p-5 sm:p-8">
        <div>
          <p className="text-eyebrow">Tu iniciativa</p>
          <h2 className="text-foreground mt-2 text-[1.625rem] font-bold leading-tight tracking-tight sm:text-[1.75rem]">
            {initiative.name}
          </h2>
          <p className="mt-3 flex flex-wrap gap-2">
            <Badge tone="info">{initiative.sector.name}</Badge>
          </p>
        </div>
        {action}
      </div>
      <dl className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-8">
        {rows.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex gap-3">
            <span className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-foreground text-base font-bold">{label}</dt>
              <dd className="text-muted-foreground mt-0.5 text-base leading-relaxed">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

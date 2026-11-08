import type { JSX, ReactNode } from 'react';
import { Factory, Milestone, Package, Target, Users, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Initiative } from '@innlab/contracts';
import { Card } from '@/shared/ui/card';
import { cn } from '@/shared/lib/utils';
import { sectorLabel } from '@/shared/lib/sector';

/**
 * The initiative as it was registered: the summary shown in the panel and
 * before processing the diagnostic.
 *
 * It opens with its name and goes down to the rest, its sector first, in blocks
 * with their icon, at reading size: it is what the user said about
 * themselves and they must be able to reread it at a glance, not decode it
 * from a definition list.
 *
 * `compact` is the panel's version: smaller blocks in three columns and each
 * answer cut to two lines, so the list of diagnostics above it and this card
 * fit on one screen (usability test P02). The whole text is in the wizard.
 */
interface Props {
  readonly initiative: Initiative;
  /** To the right of the name: e.g. the link to correct it. */
  readonly action?: ReactNode;
  /** Smaller and shorter, for the panel. */
  readonly compact?: boolean;
}

interface Row {
  readonly label: string;
  readonly value: string;
  readonly icon: LucideIcon;
}

export function InitiativeSummary({ initiative, action, compact = false }: Props): JSX.Element {
  const rows: readonly Row[] = [
    {
      label: 'Sector económico',
      value: sectorLabel(initiative.sector, initiative.customSector),
      icon: Factory,
    },
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
      <div
        className={cn(
          'border-border flex flex-wrap items-start justify-between gap-4 border-b',
          compact ? 'p-4 sm:px-6 sm:py-4' : 'p-5 sm:p-8',
        )}
      >
        <div>
          {!compact && <p className="text-eyebrow">Tu iniciativa</p>}
          {/* In the panel the section already has its heading: the name is not another one. */}
          {compact ? (
            <p className="text-foreground text-xl font-bold leading-tight tracking-tight">
              {initiative.name}
            </p>
          ) : (
            <h2 className="text-foreground mt-2 text-[1.625rem] font-bold leading-tight tracking-tight sm:text-[1.75rem]">
              {initiative.name}
            </h2>
          )}
        </div>
        {action}
      </div>
      <dl
        className={cn(
          'grid sm:grid-cols-2',
          compact ? 'gap-x-6 gap-y-4 p-4 sm:px-6 sm:py-5 lg:grid-cols-3' : 'gap-x-8 gap-y-6 p-5 sm:p-8',
        )}
      >
        {rows.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex gap-3">
            <span
              className={cn(
                'bg-azul-icesi text-primary-foreground flex shrink-0 items-center justify-center rounded-full',
                compact ? 'size-8' : 'size-10',
              )}
            >
              <Icon className={compact ? 'size-4' : 'size-5'} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className={cn('text-foreground font-bold', compact ? 'text-sm' : 'text-base')}>
                {label}
              </dt>
              <dd
                className={cn(
                  'text-muted-foreground mt-0.5',
                  compact ? 'line-clamp-2 text-sm leading-snug' : 'text-base leading-relaxed',
                )}
                title={compact ? value : undefined}
              >
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

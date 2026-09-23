import type { JSX, ReactNode } from 'react';
import { Gauge, Trophy, TriangleAlert } from 'lucide-react';
import type { Bottleneck, DimensionResult } from '@innlab/contracts';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { GlossaryTerm } from '@/shared/ui/glossary-term';
import { LevelBar } from '@/shared/ui/level-bar';

/**
 * Header of the results: the profile belongs to **an initiative**, so the
 * page opens with it — its name, a short description and the sector — and,
 * next to it, the global IRL level (RF-09: simple average of the six
 * levels, computed by the backend) with the strongest and the weakest part
 * of the profile.
 *
 * The name and the description arrive as text: this component does not
 * know where they come from (the initiative belongs to another feature and
 * the page composes them).
 */
interface Props {
  /** Name of the initiative; without it the header talks about «tu iniciativa». */
  readonly initiativeName?: string;
  readonly description?: string;
  readonly sectorName?: string;
  readonly stageName?: string;
  readonly globalAverage: number;
  readonly dimensionResults: readonly DimensionResult[];
  readonly strength: Bottleneck;
  readonly bottleneck: Bottleneck;
  /** Below the description: e.g. «Resultado guardado el …». */
  readonly children?: ReactNode;
}

/** «3,5»: one decimal with a comma; an exact integer goes without decimals. */
export function formatGlobalAverage(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function ProfileHero({
  initiativeName,
  description,
  sectorName,
  stageName,
  globalAverage,
  dimensionResults,
  strength,
  bottleneck,
  children,
}: Props): JSX.Element {
  const names = new Map(dimensionResults.map((r) => [r.dimensionCode, r.shortName]));
  const label = (codes: readonly string[]): string =>
    codes.map((c) => names.get(c as DimensionResult['dimensionCode']) ?? c).join(', ');

  return (
    <section
      aria-label="Resumen de la iniciativa"
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-14"
    >
      <div>
        <p className="text-eyebrow">Diagnóstico de madurez IRL</p>
        <h1 className="text-foreground mt-3 text-[2.125rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
          {initiativeName ?? 'Tu iniciativa'}
        </h1>
        {description !== undefined && description !== '' && (
          <p className="text-muted-foreground mt-4 max-w-prose text-lg leading-relaxed sm:text-[1.1875rem]">
            {description}
          </p>
        )}
        {(sectorName !== undefined || stageName !== undefined) && (
          <p className="mt-4 flex flex-wrap items-center gap-2">
            {sectorName !== undefined && <Badge tone="info">{sectorName}</Badge>}
            {stageName !== undefined && <Badge>Etapa: {stageName}</Badge>}
          </p>
        )}
        {children}
      </div>

      <Card className="bg-surface-muted border-border">
        <CardContent className="p-6 sm:p-7">
          <p className="text-azul-icesi flex items-center gap-2 text-sm font-bold">
            <Gauge className="size-[1.125rem]" aria-hidden="true" />
            Nivel IRL global
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-azul-icesi text-6xl font-extrabold tabular-nums leading-none tracking-[-0.04em] sm:text-[4.75rem]">
              {formatGlobalAverage(globalAverage)}
            </span>
            <span className="text-muted-foreground text-xl font-semibold">de 9</span>
          </p>
          <LevelBar level={Math.round(globalAverage)} fillClass="bg-azul-icesi" className="mt-4" />
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Es el promedio de tus seis dimensiones en la escala de 1 a 9.
          </p>

          <dl className="border-border mt-5 grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <dt className="text-acceptable flex items-center gap-1.5 text-sm font-bold">
                <Trophy className="size-4" aria-hidden="true" />
                <GlossaryTerm term="strength">Más fuerte</GlossaryTerm>
              </dt>
              <dd className="text-foreground mt-1 text-base font-semibold leading-snug">
                {label(strength.dimensions)}
                <span className="text-muted-foreground block text-sm font-medium">
                  Nivel {strength.level}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-critical flex items-center gap-1.5 text-sm font-bold">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <GlossaryTerm term="bottleneck">Más débil</GlossaryTerm>
              </dt>
              <dd className="text-foreground mt-1 text-base font-semibold leading-snug">
                {label(bottleneck.dimensions)}
                <span className="text-muted-foreground block text-sm font-medium">
                  Nivel {bottleneck.level}
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}

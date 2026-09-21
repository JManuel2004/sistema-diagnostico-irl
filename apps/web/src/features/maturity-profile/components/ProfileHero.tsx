import type { JSX, ReactNode } from 'react';
import { Trophy, TriangleAlert } from 'lucide-react';
import type { Bottleneck, DimensionResult } from '@innlab/contracts';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { GlossaryTerm } from '@/shared/ui/glossary-term';
import { LevelBar } from '@/shared/ui/level-bar';

/**
 * Cabecera de los resultados: el perfil es de **una iniciativa**, así que la
 * página abre con ella —su nombre, una descripción breve y el sector— y, al
 * lado, el nivel IRL global (RF-09: promedio simple de los seis niveles, que
 * calcula el backend) con lo más fuerte y lo más débil del perfil.
 *
 * El nombre y la descripción llegan como texto: este componente no sabe de
 * dónde salen (la iniciativa es de otra feature y la página los compone).
 */
interface Props {
  /** Nombre de la iniciativa; sin él la cabecera habla de «tu iniciativa». */
  readonly initiativeName?: string;
  readonly description?: string;
  readonly sectorName?: string;
  readonly stageName?: string;
  readonly globalAverage: number;
  readonly dimensionResults: readonly DimensionResult[];
  readonly strength: Bottleneck;
  readonly bottleneck: Bottleneck;
  /** Debajo de la descripción: p. ej. «Resultado guardado el …». */
  readonly children?: ReactNode;
}

/** «3,5»: un decimal con coma; un entero exacto va sin decimales. */
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
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
    >
      <div>
        <p className="text-azul-icesi text-sm font-bold">Diagnóstico de madurez IRL</p>
        <h1 className="text-h1 text-foreground mt-2">{initiativeName ?? 'Tu iniciativa'}</h1>
        {description !== undefined && description !== '' && (
          <p className="text-muted-foreground mt-3 max-w-prose text-lg leading-relaxed">
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

      <Card className="border-azul-icesi/30 bg-azul-wash">
        <CardContent className="p-6">
          <p className="text-azul-icesi text-sm font-bold">Nivel IRL global</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-azul-icesi text-6xl font-extrabold leading-none tabular-nums">
              {formatGlobalAverage(globalAverage)}
            </span>
            <span className="text-muted-foreground text-xl font-semibold">de 9</span>
          </p>
          <LevelBar
            level={Math.round(globalAverage)}
            fillClass="bg-azul-icesi"
            className="mt-4"
          />
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

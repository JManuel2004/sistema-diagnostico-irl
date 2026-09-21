import type { JSX } from 'react';
import { Flag, Lightbulb, ListChecks, LockOpen } from 'lucide-react';
import type { RoadmapResponse } from '@innlab/contracts';
import { DimensionChip } from '@/shared/ui/dimension-chip';
import { DisclosurePanel } from '@/shared/ui/disclosure-panel';
import { listNames } from '../utils/roadmap-explanation';

interface Props {
  readonly roadmap: RoadmapResponse;
}

/**
 * «Cómo se armó este plan» — la contraparte de la explicación de la
 * recomendación, con el mismo patrón plegable.
 *
 * Tres pasos en lenguaje llano (qué entra, qué meta se fija, qué va primero) y
 * las dimensiones que quedaron fuera. Lo que cada dimensión necesita ya está en
 * su tarjeta; aquí se explica la lógica del conjunto. Todo sale de la
 * respuesta; el panel no calcula nada.
 */
export function RoadmapExplanationPanel({ roadmap }: Props): JSX.Element {
  const dimensions = roadmap.phases.flatMap((phase) => phase.dimensions);
  const dependencies = dimensions.flatMap((d) =>
    d.enables.map((enabled) => ({ from: d.shortName, to: enabled.shortName })),
  );

  return (
    <DisclosurePanel
      id="roadmap-explanation"
      title="Cómo se armó este plan"
      icon={Lightbulb}
    >
      <ol className="flex flex-col gap-6">
        <li className="flex gap-4">
          <span className="bg-azul-icesi/15 text-azul-icesi flex size-10 shrink-0 items-center justify-center rounded-full">
            <ListChecks className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-foreground text-lg font-bold">1. Qué dimensiones entran</h3>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              Entran las que están por debajo de lo que se espera de ellas y también las que otra
              dimensión del plan necesita en un nivel más alto para poder avanzar.
            </p>
          </div>
        </li>

        <li className="flex gap-4">
          <span className="bg-azul-icesi/15 text-azul-icesi flex size-10 shrink-0 items-center justify-center rounded-full">
            <Flag className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-foreground text-lg font-bold">2. A qué nivel debe llegar cada una</h3>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              La meta es el nivel que se espera de la dimensión o, si es mayor, el que le exige la
              dimensión que depende de ella.
            </p>
          </div>
        </li>

        <li className="flex gap-4">
          <span className="bg-azul-icesi/15 text-azul-icesi flex size-10 shrink-0 items-center justify-center rounded-full">
            <LockOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-foreground text-lg font-bold">3. Qué va primero</h3>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              Una dimensión espera a la fase siguiente cuando otra del plan tiene que llegar antes a
              su meta.
            </p>
            {dependencies.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {dependencies.map((dep) => (
                  <li key={`${dep.from}-${dep.to}`} className="text-foreground text-base">
                    {dep.to} avanza cuando {dep.from} llega a su meta.
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      </ol>

      {roadmap.dimensionsWithoutIntervention.length > 0 && (
        <div className="border-border mt-6 border-t pt-5">
          <h3 className="text-foreground text-lg font-bold">Qué quedó fuera</h3>
          <p className="mt-2 flex flex-wrap gap-2">
            {roadmap.dimensionsWithoutIntervention.map((d) => (
              <DimensionChip key={d.code} code={d.code} name={d.shortName} />
            ))}
          </p>
          <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
            {listNames(roadmap.dimensionsWithoutIntervention.map((d) => d.shortName))}{' '}
            {roadmap.dimensionsWithoutIntervention.length === 1 ? 'alcanza' : 'alcanzan'} el nivel
            esperado y ninguna dimensión del plan las necesita en un nivel más alto.
          </p>
        </div>
      )}
    </DisclosurePanel>
  );
}

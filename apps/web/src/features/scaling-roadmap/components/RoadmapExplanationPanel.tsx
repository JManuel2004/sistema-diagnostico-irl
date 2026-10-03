import type { JSX } from 'react';
import { Compass, Flag, Lightbulb, ListChecks, LockOpen } from 'lucide-react';
import type { RoadmapResponse } from '@innlab/contracts';
import { DimensionChip } from '@/shared/ui/dimension-chip';
import { DisclosurePanel } from '@/shared/ui/disclosure-panel';
import { listNames } from '../utils/roadmap-explanation';

interface Props {
  readonly roadmap: RoadmapResponse;
}

/**
 * «Cómo se armó este plan» — the counterpart of the recommendation's
 * explanation, with the same collapsible pattern.
 *
 * Four steps in plain language (what goes in, which target is set, what
 * comes first, which service each phase proposes) and the dimensions left
 * out. What each dimension needs is
 * already on its card; here the logic of the whole is explained. Everything
 * comes from the response; the panel calculates nothing.
 */
export function RoadmapExplanationPanel({ roadmap }: Props): JSX.Element {
  const dimensions = roadmap.phases.flatMap((phase) => phase.dimensions);
  // A dimension whose rise spans several phases appears once per phase:
  // each dependency is told once.
  const dependencies = [
    ...new Map(
      dimensions
        .flatMap((d) => d.enables.map((enabled) => ({ from: d.shortName, to: enabled.shortName })))
        .map((dep) => [`${dep.from}-${dep.to}`, dep] as const),
    ).values(),
  ];

  return (
    <DisclosurePanel id="roadmap-explanation" title="Cómo se armó este plan" icon={Lightbulb}>
      <ol className="flex flex-col gap-6">
        <li className="flex gap-4">
          <span className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <ListChecks className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-foreground text-lg font-bold">1. Qué dimensiones entran</h3>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              Entran las que están por debajo de lo que se espera de ellas, las que otra dimensión
              del plan necesita en un nivel más alto para poder avanzar y las que, sin subir,
              quedarían muy lejos de otra con la que deben avanzar a la par.
            </p>
          </div>
        </li>

        <li className="flex gap-4">
          <span className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <Flag className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-foreground text-lg font-bold">
              2. A qué nivel debe llegar cada una
            </h3>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              La meta es el nivel que se espera de la dimensión o, si es mayor, el que le exige la
              dimensión que depende de ella o el que la deja a un nivel de su pareja. Así, al
              terminar la ruta no queda ningún desequilibrio que genere alerta.
            </p>
          </div>
        </li>

        <li className="flex gap-4">
          <span className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <LockOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-foreground text-lg font-bold">3. Qué va primero</h3>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              Una dimensión espera a la fase siguiente cuando otra del plan tiene que llegar antes a
              su meta. Además, una fase sube cada dimensión solo unos pocos niveles: una subida
              grande se reparte en varias fases.
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
        <li className="flex gap-4">
          <span className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <Compass className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-foreground text-lg font-bold">4. Qué servicio propone cada fase</h3>
            <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
              La primera fase empieza con el servicio que te recomendamos. Cada fase siguiente
              propone el servicio del portafolio que mejor trabaja sus dimensiones, sin repetir uno
              ya propuesto y sin volver a uno más liviano: la ruta va de lo más liviano a lo más
              profundo.
            </p>
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
            esperado, ninguna dimensión del plan las necesita en un nivel más alto y no quedan lejos
            de las demás.
          </p>
        </div>
      )}
    </DisclosurePanel>
  );
}

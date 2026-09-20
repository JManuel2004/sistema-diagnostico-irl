import type { JSX } from 'react';
import type { RoadmapResponse } from '@innlab/contracts';
import { DisclosurePanel } from '@/shared/ui/disclosure-panel';
import { inclusionSentence } from '../utils/roadmap-explanation';

interface Props {
  readonly roadmap: RoadmapResponse;
}

/**
 * «Cómo se construyó este roadmap» — la contraparte de la traza de la
 * recomendación, con el mismo patrón plegable.
 *
 * La tarjeta de cada dimensión ya trae su frase de motivo y de meta; este
 * panel las reúne en una sola tabla y añade lo que no cabe en una tarjeta:
 * qué dimensión desbloquea a cuál, que es lo que ordena las fases y lo que
 * permite discutir el orden propuesto. Todo sale de la respuesta; el panel
 * no calcula nada.
 */
export function RoadmapExplanationPanel({ roadmap }: Props): JSX.Element {
  const dimensions = roadmap.phases.flatMap((phase) =>
    phase.dimensions.map((d) => ({ ...d, phase: phase.order })),
  );
  const dependencies = dimensions.flatMap((d) =>
    d.enables.map((enabled) => ({ from: d.shortName, to: enabled.shortName })),
  );

  return (
    <DisclosurePanel id="roadmap-explanation" title="Cómo se construyó este roadmap">
      <div className="flex flex-col gap-6">
        <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
          Entran las dimensiones que están por debajo de su mínimo esperado y las que otra dimensión
          del plan necesita en un nivel más alto. La meta de cada una es el mayor entre su mínimo
          esperado y lo que le exige la dimensión que depende de ella.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Detalle de las dimensiones del roadmap</caption>
            <thead>
              <tr className="text-overline text-azul-icesi">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Dimensión
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Fase
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Nivel actual
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Mínimo esperado
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Meta
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Por qué está en el plan
                </th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((d) => (
                <tr key={d.dimensionCode} className="border-border border-t align-top">
                  <th scope="row" className="text-foreground py-2 pr-4 font-medium">
                    {d.shortName}
                  </th>
                  <td className="py-2 pr-4">{d.phase}</td>
                  <td className="py-2 pr-4">{d.currentLevel}</td>
                  <td className="py-2 pr-4">{d.expectedMinimum}</td>
                  <td className="py-2 pr-4 font-semibold">{d.targetLevel}</td>
                  <td className="text-muted-foreground py-2">{inclusionSentence(d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dependencies.length > 0 && (
          <div>
            <h3 className="text-overline text-azul-icesi mb-2">Qué desbloquea a qué</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {dependencies.map((dep) => (
                <li key={`${dep.from}-${dep.to}`} className="text-foreground">
                  {dep.from} <span aria-hidden="true">→</span>
                  <span className="sr-only"> desbloquea a </span> {dep.to}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-2 max-w-prose text-xs leading-relaxed">
              Una dimensión espera a la fase siguiente cuando otra del plan tiene que alcanzar su
              meta antes.
            </p>
          </div>
        )}

        {roadmap.dimensionsWithoutIntervention.length > 0 && (
          <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
            Quedan fuera {roadmap.dimensionsWithoutIntervention.map((d) => d.shortName).join(', ')}:
            alcanzan su nivel esperado y ninguna dimensión del plan las necesita en un nivel más
            alto.
          </p>
        )}
      </div>
    </DisclosurePanel>
  );
}

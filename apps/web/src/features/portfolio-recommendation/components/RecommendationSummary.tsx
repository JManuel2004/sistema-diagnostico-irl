import type { JSX } from 'react';
import { Compass, Info } from 'lucide-react';
import type { RecommendationResponse } from '@innlab/contracts';

interface Props {
  readonly recommendation: RecommendationResponse;
}

/**
 * Resultado para el líder de iniciativa.
 *
 * Deliberadamente sin números: ni puntajes ni pesos. El score es un
 * detalle interno de la calibración y mostrarlo invita a discutir el
 * número en vez de la recomendación. Quien quiera el desglose lo tiene en
 * la traza, que es la vista de la otra audiencia.
 */
export function RecommendationSummary({ recommendation }: Props): JSX.Element {
  if (recommendation.resultType === 'NO_RECOMMENDATION') {
    return (
      <section
        className="border-border bg-surface-emphasis rounded-lg border p-6"
        aria-labelledby="sin-recommendation"
      >
        <p className="text-overline text-azul-icesi">Portafolio INNLAB</p>
        <h2
          id="sin-recommendation"
          className="text-foreground mt-2 text-2xl font-bold tracking-tight"
        >
          Sin recomendación por ahora
        </h2>
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          {recommendation.noRecommendationReason}
        </p>
      </section>
    );
  }

  const primary = recommendation.primary;

  return (
    <section
      className="border-border bg-surface-emphasis rounded-lg border p-6 md:p-8"
      aria-labelledby="service-recomendado"
    >
      <p className="text-overline text-azul-icesi">Portafolio INNLAB</p>

      <div className="mt-2 flex items-start gap-3">
        <Compass className="text-azul-icesi mt-1 size-6 shrink-0" aria-hidden="true" />
        <div>
          <h2
            id="service-recomendado"
            className="text-foreground text-2xl font-bold leading-tight tracking-tight"
          >
            {primary?.name}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Servicio recomendado para tu iniciativa
          </p>
        </div>
      </div>

      {recommendation.justification !== null && (
        <p className="text-foreground mt-5 max-w-prose text-base leading-relaxed">
          {recommendation.justification}
        </p>
      )}

      {recommendation.alternatives.length > 0 && (
        <div className="border-border mt-6 border-t pt-5">
          <h3 className="text-foreground text-sm font-semibold">
            También podrían encajar
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {recommendation.alternatives.map((alt) => (
              <li
                key={alt.idService}
                className="text-muted-foreground flex items-baseline gap-3 text-sm"
              >
                <span
                  className="bg-azul-icesi/10 text-azul-icesi inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  aria-hidden="true"
                >
                  {alt.position}
                </span>
                <span className="text-foreground">{alt.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Generada el{' '}
          {new Date(recommendation.generatedAt).toLocaleString('es-CO', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}{' '}
          con el criterio de enrutamiento vigente de INNLAB.
        </span>
      </p>
    </section>
  );
}

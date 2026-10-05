import type { JSX, ReactNode } from 'react';
import { Gauge, Layers3, Target } from 'lucide-react';
import type { ServiceDetail } from '@innlab/contracts';
import { Chip } from './chip';

/**
 * `ServiceDetails` — the card of a portfolio service, the same wherever a
 * service is shown: the recommendation, its alternatives and each phase of
 * the roadmap. It says what the service is, what it can achieve and which
 * initiatives it suits, all from the catalog the response carries.
 *
 * It renders the body only; the name and its heading belong to the
 * container, which decides the heading level. The tier and the band are
 * chips with their icon («Nivel: Descubre», «IRL global 3 a 5»), each one
 * explained in its tooltip; the tier is told in words, never by a color:
 * it is not a state.
 */
interface Props {
  readonly service: ServiceDetail;
  /** Hides «¿De qué se trata?» where the container already shows it. */
  readonly withDescription?: boolean;
}

export function ServiceDetails({ service, withDescription = true }: Props): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2">
        <Chip icon={Layers3} info={tierInfo(service.tier)}>
          Nivel: {service.tier.name}
        </Chip>
        <Chip icon={Gauge} info={`${bandSentence(service.band)}.`}>
          {bandLabel(service.band)}
        </Chip>
      </p>

      {withDescription && service.description !== null && (
        <div>
          <h4 className="text-foreground text-base font-bold">¿De qué se trata?</h4>
          <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
            {service.description}
          </p>
        </div>
      )}

      <div>
        <h4 className="text-foreground flex items-center gap-1.5 text-base font-bold">
          <Target className="text-azul-icesi size-4 shrink-0" aria-hidden="true" />
          Qué puede lograr
        </h4>
        <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
          {service.scope}
        </p>
      </div>
    </div>
  );
}

/**
 * What the tier of a service is, as the portfolio describes it: its
 * promise and what its services are like. Without texts in the catalog,
 * only its name.
 */
export function tierInfo(tier: ServiceDetail['tier']): ReactNode {
  return (
    <>
      <span className="font-bold">
        Nivel {tier.name}
        {tier.tagline ? `: ${tier.tagline}.` : '.'}
      </span>
      {tier.description && <> {tier.description}</>}
    </>
  );
}

/** The band, short enough for a chip. */
export function bandLabel(band: ServiceDetail['band']): string {
  if (band === null) return 'Cualquier nivel IRL';
  if (band.minLevel === band.maxLevel) return `IRL global ${String(band.minLevel)}`;
  return `IRL global ${String(band.minLevel)} a ${String(band.maxLevel)}`;
}

/** The band in words: it is the initiative's global IRL level. */
export function bandSentence(band: ServiceDetail['band']): string {
  if (band === null) return 'Para iniciativas en cualquier nivel de madurez';
  if (band.minLevel === band.maxLevel) {
    return `Para iniciativas con nivel IRL global ${String(band.minLevel)}`;
  }
  return `Para iniciativas con nivel IRL global entre ${String(band.minLevel)} y ${String(band.maxLevel)}`;
}

import type { JSX } from 'react';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import type { DimensionCode, MaturityProfileResponse } from '@innlab/contracts';
import { Alert } from '@/shared/ui/alert';
import { GlossaryTerm } from '@/shared/ui/glossary-term';
import { SummaryCard, TONE_STYLES, type HighlightHandler } from './MaturityProfileSummary';

/**
 * Lo que el perfil solo muestra con el análisis profundo aceptado: los pares
 * de dimensiones desequilibrados y las dimensiones en estado crítico.
 *
 * Ambos vienen calculados en la respuesta (`imbalances`, `criticalState`); aquí
 * solo se presentan. Pasar el cursor por un par o una alerta resalta sus
 * dimensiones en el radar.
 */
interface Props {
  readonly profile: MaturityProfileResponse;
  readonly onHighlight?: HighlightHandler;
}

export function ImbalanceInsights({ profile, onHighlight }: Props): JSX.Element {
  const names = new Map(profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]));
  const label = (code: DimensionCode): string => names.get(code) ?? code;

  const imbalances = profile.imbalances ?? [];
  const flagged = imbalances.filter((p) => p.classification !== 'acceptable');
  const criticalDimensions = profile.criticalState.dimensions;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="imbalances-heading" className="flex flex-col gap-3">
        <h3 id="imbalances-heading" className="text-foreground text-lg font-semibold">
          <GlossaryTerm term="imbalance">Desequilibrios</GlossaryTerm> entre dimensiones
        </h3>
        {imbalances.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay pares para evaluar todavía.</p>
        ) : flagged.length > 0 ? (
          <SummaryCard
            icon={ArrowLeftRight}
            tone={flagged.some((p) => p.classification === 'critical') ? 'critical' : 'moderate'}
            eyebrow="Pares desequilibrados"
            codes={[...new Set(flagged.flatMap((p) => [p.left, p.right]))]}
            onHighlight={onHighlight}
            title={`${flagged.length} de ${imbalances.length} pares fuera de balance`}
          >
            <ul className="flex flex-col gap-1.5">
              {flagged.map((p) => {
                const chip = TONE_STYLES[p.classification];
                return (
                  <li
                    key={`${p.left}-${p.right}`}
                    className="flex items-center gap-2"
                    onMouseEnter={() => {
                      onHighlight?.([p.left, p.right]);
                    }}
                    onMouseLeave={() => {
                      onHighlight?.([]);
                    }}
                  >
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${chip.chipBg} ${chip.chipText}`}
                    >
                      <span>{label(p.left)}</span>
                      <span aria-hidden className="opacity-60">
                        —
                      </span>
                      <span>{label(p.right)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Diferencia de {p.difference} ·{' '}
                      {p.classification === 'critical' ? 'crítico' : 'moderado'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </SummaryCard>
        ) : (
          <SummaryCard
            icon={CheckCircle2}
            tone="acceptable"
            eyebrow="Pares"
            codes={[]}
            title={`Los ${imbalances.length} pares se mantienen dentro del rango aceptable`}
          />
        )}
      </section>

      <section aria-labelledby="critical-heading" className="flex flex-col gap-3">
        <h3 id="critical-heading" className="text-foreground text-lg font-semibold">
          Dimensiones en <GlossaryTerm term="criticalState">estado crítico</GlossaryTerm>
        </h3>
        {criticalDimensions.length === 0 ? (
          <Alert tone="acceptable" title="Ninguna dimensión clave está en estado crítico." />
        ) : (
          criticalDimensions.map((code) => (
            <div
              key={code}
              onMouseEnter={() => {
                onHighlight?.([code]);
              }}
              onMouseLeave={() => {
                onHighlight?.([]);
              }}
            >
              <Alert tone="critical" title={`${label(code)} está en estado crítico`}>
                Es una dimensión clave y su nivel está en la zona más baja: conviene atenderla antes
                que el resto.
              </Alert>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

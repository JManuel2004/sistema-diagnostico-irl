import type { JSX } from 'react';
import { AlertCircle, ArrowLeftRight, CheckCircle2, Scale, TrendingDown } from 'lucide-react';
import type {
  Asymmetry,
  Bottleneck,
  DimensionResult,
  Gaps,
  ImbalanceClassification,
  ImbalancePairResult,
} from '@innlab/contracts';
import { getDimensionShortName } from '@/shared/lib/dimensions';

/**
 * Las etiquetas cortas viven en `shared/lib/dimensions` y no aquí: el
 * roadmap también las necesita, y el aislamiento por feature impide que
 * las tome de este componente. Duplicarlas habría añadido una fuente más
 * de nombres a las que el repositorio ya arrastra.
 */
const dimensionLabel = getDimensionShortName;

const TONE_STYLES: Record<
  ImbalanceClassification | 'neutral',
  { ring: string; iconColor: string; chipBg: string; chipText: string }
> = {
  critical: {
    ring: 'border-[var(--color-critical,#A53221)]/30 bg-[var(--color-critical,#A53221)]/5',
    iconColor: 'text-[var(--color-critical,#A53221)]',
    chipBg: 'bg-[var(--color-critical,#A53221)]/10',
    chipText: 'text-[var(--color-critical,#A53221)]',
  },
  moderate: {
    ring: 'border-[var(--color-moderate,#8C3811)]/30 bg-[var(--color-moderate,#8C3811)]/5',
    iconColor: 'text-[var(--color-moderate,#8C3811)]',
    chipBg: 'bg-[var(--color-moderate,#8C3811)]/10',
    chipText: 'text-[var(--color-moderate,#8C3811)]',
  },
  acceptable: {
    ring: 'border-[var(--color-acceptable,#1F633D)]/30 bg-[var(--color-acceptable,#1F633D)]/5',
    iconColor: 'text-[var(--color-acceptable,#1F633D)]',
    chipBg: 'bg-[var(--color-acceptable,#1F633D)]/10',
    chipText: 'text-[var(--color-acceptable,#1F633D)]',
  },
  neutral: {
    ring: 'border-border bg-background',
    iconColor: 'text-azul-icesi',
    chipBg: 'bg-azul-icesi/10',
    chipText: 'text-azul-icesi',
  },
};

function SummaryCard({
  icon: Icon,
  tone,
  eyebrow,
  title,
  children,
}: {
  icon: typeof CheckCircle2;
  tone: ImbalanceClassification | 'neutral';
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}): JSX.Element {
  const styles = TONE_STYLES[tone];
  return (
    <article
      className={`flex gap-3 rounded-lg border p-4 ${styles.ring}`}
      role="group"
      aria-label={`${eyebrow}: ${title}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${styles.iconColor}`}
        strokeLinejoin="miter"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-overline text-muted-foreground">{eyebrow}</p>
        <p className="text-foreground mt-1 text-sm font-semibold leading-snug">{title}</p>
        {children !== undefined && <div className="mt-2 text-xs leading-relaxed">{children}</div>}
      </div>
    </article>
  );
}

function bottleneckTone(level: number): ImbalanceClassification | 'neutral' {
  if (level <= 3) return 'critical';
  if (level <= 5) return 'moderate';
  return 'acceptable';
}

interface MaturityProfileSummaryProps {
  dimensionResults: readonly DimensionResult[];
  bottleneck?: Bottleneck;
  strength?: Bottleneck;
  asymmetry?: Asymmetry;
  gaps?: Gaps;
  imbalances?: readonly ImbalancePairResult[];
}

export function MaturityProfileSummary({
  dimensionResults,
  bottleneck,
  strength,
  asymmetry,
  gaps,
  imbalances,
}: MaturityProfileSummaryProps): JSX.Element {
  const strengthNames = (strength?.dimensions ?? []).map(dimensionLabel);
  const gapNames = (gaps?.dimensions ?? []).map(dimensionLabel);
  const gapThreshold = gaps?.threshold;
  const flaggedPairs = (imbalances ?? []).filter((p) => p.classification !== 'acceptable');

  if (dimensionResults.length === 0) {
    return (
      <aside aria-label="Señales del perfil" className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">Sin datos para resumir todavía.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Señales del perfil" className="flex flex-col gap-3">
      <header className="mb-1">
        <p className="text-overline text-azul-icesi">Señales que vemos</p>
        <h2 className="text-foreground mt-1 text-xl font-bold leading-tight">en tu radar</h2>
      </header>

      {strength !== undefined && (
        <SummaryCard
          icon={CheckCircle2}
          tone="acceptable"
          eyebrow="Fortaleza clara"
          title={
            strengthNames.length === 1
              ? `${strengthNames[0]} — nivel ${strength.level}`
              : `${strengthNames.length} dimensiones empatadas en nivel ${strength.level}`
          }
        >
          {strengthNames.length > 1 && (
            <p className="text-muted-foreground">{strengthNames.join(', ')}</p>
          )}
        </SummaryCard>
      )}

      {bottleneck !== undefined && (
        <SummaryCard
          icon={AlertCircle}
          tone={bottleneckTone(bottleneck.level)}
          eyebrow="Cuello de botella"
          title={
            bottleneck.dimensions.length === 1
              ? `${dimensionLabel(bottleneck.dimensions[0])} — nivel ${bottleneck.level}`
              : `${bottleneck.dimensions.length} dimensiones empatadas en nivel ${bottleneck.level}`
          }
        >
          {bottleneck.dimensions.length > 1 && (
            <p className="text-muted-foreground">
              {bottleneck.dimensions.map(dimensionLabel).join(', ')}
            </p>
          )}
        </SummaryCard>
      )}

      {asymmetry !== undefined && (
        <SummaryCard
          icon={Scale}
          tone={asymmetry.classification}
          eyebrow="Asimetría"
          title={`${asymmetry.difference} ${asymmetry.difference === 1 ? 'nivel' : 'niveles'} entre la dimensión más alta y la más baja`}
        >
          <p className="text-muted-foreground">
            {asymmetry.classification === 'critical' && 'Asimetría crítica — atención prioritaria.'}
            {asymmetry.classification === 'moderate' && 'Asimetría moderada — vale la pena equilibrar.'}
            {asymmetry.classification === 'acceptable' && 'Perfil balanceado dentro del rango KTH.'}
          </p>
        </SummaryCard>
      )}

      {gapNames.length > 0 && gapThreshold !== undefined && (
        <SummaryCard
          icon={TrendingDown}
          tone="critical"
          eyebrow={`Brecha (nivel ≤ ${gapThreshold})`}
          title={`${gapNames.length} ${gapNames.length === 1 ? 'dimensión requiere' : 'dimensiones requieren'} atención`}
        >
          <p className="text-muted-foreground">{gapNames.join(', ')}</p>
        </SummaryCard>
      )}

      {imbalances !== undefined &&
        (flaggedPairs.length > 0 ? (
          <SummaryCard
            icon={ArrowLeftRight}
            tone={flaggedPairs.some((p) => p.classification === 'critical') ? 'critical' : 'moderate'}
            eyebrow="Pares desequilibrados"
            title={`${flaggedPairs.length} de ${imbalances.length} pares KTH fuera de balance`}
          >
            <ul className="flex flex-col gap-1.5">
              {flaggedPairs.map((p) => {
                const chip = TONE_STYLES[p.classification];
                return (
                  <li key={`${p.left}-${p.right}`} className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${chip.chipBg} ${chip.chipText}`}
                    >
                      <span>{p.left}</span>
                      <span aria-hidden className="opacity-60">
                        —
                      </span>
                      <span>{p.right}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Δ {p.difference} · {p.classification === 'critical' ? 'crítico' : 'moderado'}
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
            eyebrow="Pares KTH"
            title={`Los ${imbalances.length} pares se mantienen dentro del rango aceptable`}
          />
        ))}
    </aside>
  );
}

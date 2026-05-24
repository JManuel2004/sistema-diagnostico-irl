import type { JSX } from 'react';
import { AlertCircle, ArrowLeftRight, CheckCircle2, Scale, TrendingDown } from 'lucide-react';
import type { Bottleneck, DimensionResult } from '@innlab/contracts';
import {
  classifyImbalance,
  computeProfileInsights,
  type ImbalanceClassification,
  type ImbalancePairInsight,
} from '../utils/profile-insights';

const DIMENSION_NAME_ES: Record<string, string> = {
  TRL: 'Tecnología',
  CRL: 'Cliente',
  BRL: 'Negocio',
  IPRL: 'Propiedad Intelectual',
  TmRL: 'Equipo',
  FRL: 'Financiación',
};

function dimensionLabel(code: string): string {
  return DIMENSION_NAME_ES[code] ?? code;
}

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
}

export function MaturityProfileSummary({
  dimensionResults,
  bottleneck: serverBottleneck,
}: MaturityProfileSummaryProps): JSX.Element {
  const insights = computeProfileInsights(dimensionResults);

  const resolvedBottleneck: { level: number; dimensions: readonly string[] } =
    serverBottleneck ?? {
      level: insights.bottleneck.level,
      dimensions: insights.bottleneck.dimensions,
    };

  const strengthNames = insights.strength.dimensions.map(dimensionLabel);
  const gapNames = insights.gapDimensions.map(dimensionLabel);

  const asymmetryTone = classifyImbalance(insights.asymmetry);

  const flaggedPairs: readonly ImbalancePairInsight[] = insights.imbalances.filter(
    (p) => p.classification !== 'acceptable',
  );

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

      <SummaryCard
        icon={CheckCircle2}
        tone="acceptable"
        eyebrow="Fortaleza clara"
        title={
          strengthNames.length === 1
            ? `${strengthNames[0]} — nivel ${insights.strength.level}`
            : `${strengthNames.length} dimensiones empatadas en nivel ${insights.strength.level}`
        }
      >
        {strengthNames.length > 1 && (
          <p className="text-muted-foreground">{strengthNames.join(', ')}</p>
        )}
      </SummaryCard>

      <SummaryCard
        icon={AlertCircle}
        tone={bottleneckTone(resolvedBottleneck.level)}
        eyebrow="Cuello de botella"
        title={
          resolvedBottleneck.dimensions.length === 1
            ? `${dimensionLabel(resolvedBottleneck.dimensions[0])} — nivel ${resolvedBottleneck.level}`
            : `${resolvedBottleneck.dimensions.length} dimensiones empatadas en nivel ${resolvedBottleneck.level}`
        }
      >
        {resolvedBottleneck.dimensions.length > 1 && (
          <p className="text-muted-foreground">
            {resolvedBottleneck.dimensions.map(dimensionLabel).join(', ')}
          </p>
        )}
      </SummaryCard>

      <SummaryCard
        icon={Scale}
        tone={asymmetryTone}
        eyebrow="Asimetría"
        title={`${insights.asymmetry} ${insights.asymmetry === 1 ? 'nivel' : 'niveles'} entre la dimensión más alta y la más baja`}
      >
        <p className="text-muted-foreground">
          {asymmetryTone === 'critical' && 'Asimetría crítica — atención prioritaria.'}
          {asymmetryTone === 'moderate' && 'Asimetría moderada — vale la pena equilibrar.'}
          {asymmetryTone === 'acceptable' && 'Perfil balanceado dentro del rango KTH.'}
        </p>
      </SummaryCard>

      {gapNames.length > 0 && (
        <SummaryCard
          icon={TrendingDown}
          tone="critical"
          eyebrow="Brecha (nivel ≤ 3)"
          title={`${gapNames.length} ${gapNames.length === 1 ? 'dimensión requiere' : 'dimensiones requieren'} atención`}
        >
          <p className="text-muted-foreground">{gapNames.join(', ')}</p>
        </SummaryCard>
      )}

      {flaggedPairs.length > 0 ? (
        <SummaryCard
          icon={ArrowLeftRight}
          tone={flaggedPairs.some((p) => p.classification === 'critical') ? 'critical' : 'moderate'}
          eyebrow="Pares desequilibrados"
          title={`${flaggedPairs.length} de 6 pares KTH fuera de balance`}
        >
          <ul className="flex flex-col gap-1.5">
            {flaggedPairs.map((p) => {
              const chip = TONE_STYLES[p.classification];
              return (
                <li key={`${p.pair[0]}-${p.pair[1]}`} className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${chip.chipBg} ${chip.chipText}`}
                  >
                    <span>{p.pair[0]}</span>
                    <span aria-hidden className="opacity-60">
                      —
                    </span>
                    <span>{p.pair[1]}</span>
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
          title="Los 6 pares se mantienen dentro del rango aceptable"
        />
      )}
    </aside>
  );
}

import type { JSX, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Scale, TrendingDown } from 'lucide-react';
import type {
  Asymmetry,
  Bottleneck,
  DimensionCode,
  DimensionResult,
  Gaps,
  ImbalanceClassification,
} from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';
import { GlossaryTerm } from '@/shared/ui/glossary-term';
import { DimensionChip } from '@/shared/ui/dimension-chip';
import type { GlossaryKey } from '@/shared/lib/glossary';

/**
 * Las etiquetas cortas vienen de la respuesta (`shortName` de cada resultado
 * de dimensión), no de un mapa del frontend: el frontend no mantiene nombres
 * de dimensión.
 */

export const TONE_STYLES: Record<
  ImbalanceClassification | 'neutral',
  { ring: string; iconColor: string; iconBg: string; chipBg: string; chipText: string }
> = {
  critical: {
    ring: 'border-border bg-card',
    iconColor: 'text-critical',
    iconBg: 'border border-border bg-background',
    chipBg: 'bg-surface-muted',
    chipText: 'text-critical',
  },
  moderate: {
    ring: 'border-border bg-card',
    iconColor: 'text-moderate',
    iconBg: 'border border-border bg-background',
    chipBg: 'bg-surface-muted',
    chipText: 'text-moderate',
  },
  acceptable: {
    ring: 'border-border bg-card',
    iconColor: 'text-acceptable',
    iconBg: 'border border-border bg-background',
    chipBg: 'bg-surface-muted',
    chipText: 'text-acceptable',
  },
  neutral: {
    ring: 'border-border bg-card',
    iconColor: 'text-azul-icesi',
    iconBg: 'border border-border bg-background',
    chipBg: 'bg-surface-muted',
    chipText: 'text-azul-icesi',
  },
};

/** Lo que una tarjeta hace al pasar el cursor o al enfocarla: resaltar en el radar. */
export type HighlightHandler = (codes: readonly DimensionCode[]) => void;

interface SummaryCardProps {
  icon: typeof CheckCircle2;
  tone: ImbalanceClassification | 'neutral';
  eyebrow: string;
  /** Término del glosario que explica el `eyebrow` en un tooltip. */
  glossary?: GlossaryKey;
  title: string;
  /** Dimensiones que esta tarjeta señala: se resaltan en el radar. */
  codes: readonly DimensionCode[];
  onHighlight?: HighlightHandler;
  children?: ReactNode;
}

export function SummaryCard({
  icon: Icon,
  tone,
  eyebrow,
  glossary,
  title,
  codes,
  onHighlight,
  children,
}: SummaryCardProps): JSX.Element {
  const styles = TONE_STYLES[tone];
  const highlight = onHighlight
    ? {
        tabIndex: 0,
        onMouseEnter: () => {
          onHighlight(codes);
        },
        onMouseLeave: () => {
          onHighlight([]);
        },
        onFocus: () => {
          onHighlight(codes);
        },
        onBlur: () => {
          onHighlight([]);
        },
      }
    : {};
  return (
    <Card role="group" aria-label={`${eyebrow}: ${title}`} className={styles.ring} {...highlight}>
      <CardContent className="flex gap-4 p-4 sm:p-5">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
        >
          <Icon className={`size-6 ${styles.iconColor}`} strokeLinejoin="miter" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${styles.iconColor} text-sm font-bold`}>
            {glossary ? <GlossaryTerm term={glossary}>{eyebrow}</GlossaryTerm> : eyebrow}
          </p>
          <p className="text-foreground mt-1 text-base font-semibold leading-snug">{title}</p>
          {children !== undefined && (
            <div className="text-muted-foreground mt-2 text-sm leading-relaxed">{children}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MaturityProfileSummaryProps {
  dimensionResults: readonly DimensionResult[];
  bottleneck?: Bottleneck;
  strength?: Bottleneck;
  asymmetry?: Asymmetry;
  gaps?: Gaps;
  /** Resalta en el radar las dimensiones de la tarjeta bajo el cursor. */
  onHighlight?: HighlightHandler;
}

const ASYMMETRY_TEXT: Record<ImbalanceClassification, string> = {
  critical: 'Es una diferencia muy grande: conviene atender primero lo más rezagado.',
  moderate: 'Es una diferencia importante: vale la pena equilibrar.',
  acceptable: 'Tu iniciativa avanza de forma pareja.',
};

/**
 * Las señales del perfil: fortaleza, cuello de botella, asimetría y brechas.
 * Los pares desequilibrados y el estado crítico no están aquí: pertenecen al
 * análisis profundo (`ImbalanceInsights`).
 */
export function MaturityProfileSummary({
  dimensionResults,
  bottleneck,
  strength,
  asymmetry,
  gaps,
  onHighlight,
}: MaturityProfileSummaryProps): JSX.Element {
  // The names come from the response itself (the six results carry them), not
  // from a map kept in the frontend.
  const shortNameByCode = new Map(dimensionResults.map((r) => [r.dimensionCode, r.shortName]));
  const dimensionLabel = (code: DimensionCode): string => shortNameByCode.get(code) ?? code;
  const chips = (codes: readonly DimensionCode[]): JSX.Element => (
    <span className="flex flex-wrap gap-2">
      {codes.map((code) => (
        <DimensionChip key={code} code={code} name={dimensionLabel(code)} />
      ))}
    </span>
  );
  const strengthNames = (strength?.dimensions ?? []).map(dimensionLabel);
  const gapNames = (gaps?.dimensions ?? []).map(dimensionLabel);
  const gapThreshold = gaps?.threshold;

  if (dimensionResults.length === 0) {
    return (
      <aside aria-label="Señales del perfil" className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">Sin datos para resumir todavía.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Señales del perfil" className="flex flex-col gap-4">
      <header>
        <p className="text-eyebrow">Lectura visual</p>
        <h2 className="text-foreground mt-2 text-[1.375rem] font-bold leading-tight tracking-tight">
          Señales que vemos en tu radar
        </h2>
      </header>

      {strength !== undefined && (
        <SummaryCard
          icon={CheckCircle2}
          tone="acceptable"
          eyebrow="Fortaleza clara"
          glossary="strength"
          codes={strength.dimensions}
          onHighlight={onHighlight}
          title={
            strengthNames.length === 1
              ? `${strengthNames[0]} — nivel ${String(strength.level)}`
              : `${String(strengthNames.length)} dimensiones empatadas en nivel ${String(strength.level)}`
          }
        >
          {strengthNames.length > 1 ? (
            chips(strength.dimensions)
          ) : (
            <p>Es lo más sólido de tu iniciativa hoy.</p>
          )}
        </SummaryCard>
      )}

      {bottleneck !== undefined && (
        <SummaryCard
          icon={AlertCircle}
          tone="neutral"
          eyebrow="Cuello de botella"
          glossary="bottleneck"
          codes={bottleneck.dimensions}
          onHighlight={onHighlight}
          title={
            bottleneck.dimensions.length === 1
              ? `${dimensionLabel(bottleneck.dimensions[0])} — nivel ${String(bottleneck.level)}`
              : `${String(bottleneck.dimensions.length)} dimensiones empatadas en nivel ${String(bottleneck.level)}`
          }
        >
          {bottleneck.dimensions.length > 1 ? (
            chips(bottleneck.dimensions)
          ) : (
            <p>Es lo que más frena el avance del conjunto.</p>
          )}
        </SummaryCard>
      )}

      {asymmetry !== undefined && (
        <SummaryCard
          icon={Scale}
          tone={asymmetry.classification}
          eyebrow="Asimetría"
          glossary="asymmetry"
          // The asymmetry is between the highest and the lowest dimension.
          codes={[...(strength?.dimensions ?? []), ...(bottleneck?.dimensions ?? [])]}
          onHighlight={onHighlight}
          title={`${String(asymmetry.difference)} ${asymmetry.difference === 1 ? 'nivel' : 'niveles'} entre la dimensión más alta y la más baja`}
        >
          <p>{ASYMMETRY_TEXT[asymmetry.classification]}</p>
        </SummaryCard>
      )}

      {gapNames.length > 0 && gapThreshold !== undefined && (
        <SummaryCard
          icon={TrendingDown}
          tone="critical"
          eyebrow="Brecha"
          glossary="gap"
          codes={gaps?.dimensions ?? []}
          onHighlight={onHighlight}
          title={`${String(gapNames.length)} ${gapNames.length === 1 ? 'dimensión en nivel' : 'dimensiones en nivel'} ${String(gapThreshold)} o menos`}
        >
          {chips(gaps?.dimensions ?? [])}
        </SummaryCard>
      )}
    </aside>
  );
}

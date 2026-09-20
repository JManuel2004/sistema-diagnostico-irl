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
import type { GlossaryKey } from '@/shared/lib/glossary';

/**
 * Las etiquetas cortas vienen de la respuesta (`shortName` de cada resultado
 * de dimensión), no de un mapa del frontend: el frontend no mantiene nombres
 * de dimensión (backlog 4.5).
 */

export const TONE_STYLES: Record<
  ImbalanceClassification | 'neutral',
  { ring: string; iconColor: string; chipBg: string; chipText: string }
> = {
  critical: {
    ring: 'border-critical/30 bg-critical/5',
    iconColor: 'text-critical',
    chipBg: 'bg-critical/10',
    chipText: 'text-critical',
  },
  moderate: {
    ring: 'border-moderate/30 bg-moderate/5',
    iconColor: 'text-moderate',
    chipBg: 'bg-moderate/10',
    chipText: 'text-moderate',
  },
  acceptable: {
    ring: 'border-acceptable/30 bg-acceptable/5',
    iconColor: 'text-acceptable',
    chipBg: 'bg-acceptable/10',
    chipText: 'text-acceptable',
  },
  neutral: {
    ring: 'border-border bg-background',
    iconColor: 'text-azul-icesi',
    chipBg: 'bg-azul-icesi/10',
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
      <CardContent className="flex gap-3 p-4">
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${styles.iconColor}`}
          strokeLinejoin="miter"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-overline text-muted-foreground">
            {glossary ? <GlossaryTerm term={glossary}>{eyebrow}</GlossaryTerm> : eyebrow}
          </p>
          <p className="text-foreground mt-1 text-sm font-semibold leading-snug">{title}</p>
          {children !== undefined && <div className="mt-2 text-xs leading-relaxed">{children}</div>}
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
          glossary="strength"
          codes={strength.dimensions}
          onHighlight={onHighlight}
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
          tone="neutral"
          eyebrow="Cuello de botella"
          glossary="bottleneck"
          codes={bottleneck.dimensions}
          onHighlight={onHighlight}
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
          glossary="asymmetry"
          // The asymmetry is between the highest and the lowest dimension.
          codes={[...(strength?.dimensions ?? []), ...(bottleneck?.dimensions ?? [])]}
          onHighlight={onHighlight}
          title={`${asymmetry.difference} ${asymmetry.difference === 1 ? 'nivel' : 'niveles'} entre la dimensión más alta y la más baja`}
        >
          <p className="text-muted-foreground">
            {asymmetry.classification === 'critical' && 'Asimetría crítica — atención prioritaria.'}
            {asymmetry.classification === 'moderate' &&
              'Asimetría moderada — vale la pena equilibrar.'}
            {asymmetry.classification === 'acceptable' && 'Perfil balanceado dentro del rango KTH.'}
          </p>
        </SummaryCard>
      )}

      {gapNames.length > 0 && gapThreshold !== undefined && (
        <SummaryCard
          icon={TrendingDown}
          tone="critical"
          eyebrow={`Brecha (nivel ≤ ${gapThreshold})`}
          glossary="gap"
          codes={gaps?.dimensions ?? []}
          onHighlight={onHighlight}
          title={`${gapNames.length} ${gapNames.length === 1 ? 'dimensión requiere' : 'dimensiones requieren'} atención`}
        >
          <p className="text-muted-foreground">{gapNames.join(', ')}</p>
        </SummaryCard>
      )}
    </aside>
  );
}

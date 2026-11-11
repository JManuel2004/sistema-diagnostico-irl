import { useState, type JSX, type KeyboardEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Scale, TrendingDown } from 'lucide-react';
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
import { cn } from '@/shared/lib/utils';
import { GLOSSARY, type GlossaryKey } from '@/shared/lib/glossary';
import { SignalDetails, type SignalDimension } from './SignalDetails';

/**
 * The short labels come from the response (`shortName` of each dimension
 * result), not from a frontend map: the frontend keeps no dimension names.
 */

/** The color of a card's icon and eyebrow; the card itself is always neutral. */
const TONE_COLOR: Record<ImbalanceClassification | 'neutral', string> = {
  critical: 'text-critical',
  moderate: 'text-moderate',
  acceptable: 'text-acceptable',
  neutral: 'text-azul-icesi',
};

/** What a card does on hover or focus: highlight in the radar. */
export type HighlightHandler = (codes: readonly DimensionCode[]) => void;

/** What a card's dialog says about the initiative. */
interface CardDetails {
  readonly summary: string;
  readonly dimensions: readonly SignalDimension[];
}

interface SummaryCardProps {
  icon: typeof CheckCircle2;
  tone: ImbalanceClassification | 'neutral';
  eyebrow: string;
  /** Glossary term that explains the `eyebrow` in a tooltip. */
  glossary?: GlossaryKey;
  title: string;
  /** Dimensions this card points at: they are highlighted in the radar. */
  codes: readonly DimensionCode[];
  /** Dimensions highlighted right now: the card that points at them stands out, the rest fade. */
  highlighted?: readonly DimensionCode[];
  onHighlight?: HighlightHandler;
  /** What the signal means for this initiative: a click on the card opens it. */
  details?: CardDetails;
  children?: ReactNode;
}

const sameCodes = (a: readonly DimensionCode[], b: readonly DimensionCode[]): boolean =>
  a.length === b.length && a.every((code) => b.includes(code));

export function SummaryCard({
  icon: Icon,
  tone,
  eyebrow,
  glossary,
  title,
  codes,
  highlighted = [],
  onHighlight,
  details,
  children,
}: SummaryCardProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const color = TONE_COLOR[tone];
  const active = highlighted.length > 0 && sameCodes(codes, highlighted);
  const faded = highlighted.length > 0 && !active;
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
  // The whole card opens its details with a click or a tap; with the
  // keyboard, Enter on the card or the button inside it.
  const opener = details
    ? {
        onClick: () => {
          setOpen(true);
        },
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' && event.target === event.currentTarget) setOpen(true);
        },
      }
    : {};
  return (
    <>
      <Card
        role="group"
        aria-label={`${eyebrow}: ${title}`}
        className={cn(
          'border-border bg-card transition-[opacity,box-shadow,border-color]',
          details && 'hover:border-azul-icesi/60 cursor-pointer',
          active && 'border-azul-icesi ring-azul-icesi ring-1',
          faded && 'opacity-40',
        )}
        {...highlight}
        {...opener}
      >
        <CardContent className="flex gap-4 p-4 sm:p-5">
          <span className="border-border bg-background flex size-11 shrink-0 items-center justify-center rounded-full border">
            <Icon className={`size-6 ${color}`} strokeLinejoin="miter" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`${color} text-sm font-bold`}>
              {glossary ? <GlossaryTerm term={glossary}>{eyebrow}</GlossaryTerm> : eyebrow}
            </p>
            <p className="text-foreground mt-1 text-base font-semibold leading-snug">{title}</p>
            {children !== undefined && (
              <div className="text-muted-foreground mt-2 text-sm leading-relaxed">{children}</div>
            )}
            {details && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(true);
                }}
                className="text-azul-icesi mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              >
                Qué significa para tu iniciativa
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      {details && open && (
        <SignalDetails
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          title={eyebrow}
          meaning={glossary ? GLOSSARY[glossary].explanation : ''}
          summary={details.summary}
          dimensions={details.dimensions}
        />
      )}
    </>
  );
}

interface MaturityProfileSummaryProps {
  dimensionResults: readonly DimensionResult[];
  bottleneck?: Bottleneck;
  strength?: Bottleneck;
  asymmetry?: Asymmetry;
  gaps?: Gaps;
  /** Dimensions highlighted right now, by a card, a level or the radar itself. */
  highlighted?: readonly DimensionCode[];
  /** Highlights in the radar the dimensions of the card under the cursor. */
  onHighlight?: HighlightHandler;
}

const ASYMMETRY_TEXT: Record<ImbalanceClassification, string> = {
  critical: 'Es una diferencia muy grande: conviene atender primero lo más rezagado.',
  moderate: 'Es una diferencia importante: vale la pena equilibrar.',
  acceptable: 'Tu iniciativa avanza de forma equilibrada.',
};

/** «Cliente», «Cliente y Negocio», «Cliente, Negocio y Equipo». */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * The signals of the profile: strength, bottleneck, asymmetry and gaps.
 * The imbalanced pairs and the critical state are not here: they belong to
 * the deep analysis (`ImbalanceInsights`).
 *
 * Every card names its dimensions the same way, with their chip (icon and
 * color, usability test P03), and opens, with a click, what the signal means
 * for this initiative (`SignalDetails`, P05): its dimensions with their level
 * and the meaning of that level, from the profile.
 */
export function MaturityProfileSummary({
  dimensionResults,
  bottleneck,
  strength,
  asymmetry,
  gaps,
  highlighted,
  onHighlight,
}: MaturityProfileSummaryProps): JSX.Element {
  // The names come from the response itself (the six results carry them), not
  // from a map kept in the frontend.
  const resultByCode = new Map(dimensionResults.map((r) => [r.dimensionCode, r]));
  const dimensionLabel = (code: DimensionCode): string =>
    resultByCode.get(code)?.shortName ?? code;
  const chips = (codes: readonly DimensionCode[]): JSX.Element => (
    <span className="flex flex-wrap gap-2">
      {codes.map((code) => (
        <DimensionChip key={code} code={code} name={dimensionLabel(code)} />
      ))}
    </span>
  );
  const signalDimensions = (codes: readonly DimensionCode[]): SignalDimension[] =>
    codes.map((code) => {
      const result = resultByCode.get(code);
      return {
        code,
        name: dimensionLabel(code),
        level: result?.irlLevel ?? 0,
        levelDescription: result?.levelDescription ?? null,
      };
    });
  const names = (codes: readonly DimensionCode[]): string => joinNames(codes.map(dimensionLabel));
  const isAre = (codes: readonly DimensionCode[]): string => (codes.length === 1 ? 'está' : 'están');
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
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Toca una señal para ver qué significa para tu iniciativa.
        </p>
      </header>

      {strength !== undefined && (
        <SummaryCard
          icon={CheckCircle2}
          tone="acceptable"
          eyebrow="Fortaleza clara"
          glossary="strength"
          codes={strength.dimensions}
          highlighted={highlighted}
          onHighlight={onHighlight}
          title={
            strengthNames.length === 1
              ? `${strengthNames[0]} — nivel ${String(strength.level)}`
              : `${String(strengthNames.length)} dimensiones empatadas en nivel ${String(strength.level)}`
          }
          details={{
            summary: `${names(strength.dimensions)} ${isAre(strength.dimensions)} en nivel ${String(strength.level)}, lo más avanzado de tu iniciativa hoy. Es una base en la que puedes apoyarte para subir las dimensiones más rezagadas.`,
            dimensions: signalDimensions(strength.dimensions),
          }}
        >
          {chips(strength.dimensions)}
          {strengthNames.length === 1 && <p className="mt-2">Es lo más sólido de tu iniciativa hoy.</p>}
        </SummaryCard>
      )}

      {bottleneck !== undefined && (
        <SummaryCard
          icon={AlertCircle}
          tone="neutral"
          eyebrow="Cuello de botella"
          glossary="bottleneck"
          codes={bottleneck.dimensions}
          highlighted={highlighted}
          onHighlight={onHighlight}
          title={
            bottleneck.dimensions.length === 1
              ? `${dimensionLabel(bottleneck.dimensions[0])} — nivel ${String(bottleneck.level)}`
              : `${String(bottleneck.dimensions.length)} dimensiones empatadas en nivel ${String(bottleneck.level)}`
          }
          details={{
            summary: `${names(bottleneck.dimensions)} ${isAre(bottleneck.dimensions)} en nivel ${String(bottleneck.level)}, lo más bajo de tu iniciativa. Mientras no suba, frena el avance del conjunto: es lo primero que conviene fortalecer.`,
            dimensions: signalDimensions(bottleneck.dimensions),
          }}
        >
          {chips(bottleneck.dimensions)}
          {bottleneck.dimensions.length === 1 && (
            <p className="mt-2">Es lo que más frena el avance del conjunto.</p>
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
          highlighted={highlighted}
          onHighlight={onHighlight}
          title={`Hay ${String(asymmetry.difference)} ${asymmetry.difference === 1 ? 'nivel' : 'niveles'} de diferencia entre la dimensión con la calificación más alta y la más baja`}
          details={
            strength && bottleneck
              ? {
                  summary: `${names(strength.dimensions)} ${isAre(strength.dimensions)} en nivel ${String(strength.level)} y ${names(bottleneck.dimensions)} en nivel ${String(bottleneck.level)}: ${String(asymmetry.difference)} ${asymmetry.difference === 1 ? 'nivel' : 'niveles'} de diferencia. ${ASYMMETRY_TEXT[asymmetry.classification]}`,
                  dimensions: signalDimensions([...strength.dimensions, ...bottleneck.dimensions]),
                }
              : undefined
          }
        >
          {strength && bottleneck && chips([...strength.dimensions, ...bottleneck.dimensions])}
          <p className={strength && bottleneck ? 'mt-2' : undefined}>
            {ASYMMETRY_TEXT[asymmetry.classification]}
          </p>
        </SummaryCard>
      )}

      {gapNames.length > 0 && gapThreshold !== undefined && (
        <SummaryCard
          icon={TrendingDown}
          tone="moderate"
          eyebrow="Dimensiones de cuidado"
          glossary="gap"
          codes={gaps?.dimensions ?? []}
          highlighted={highlighted}
          onHighlight={onHighlight}
          title={`${String(gapNames.length)} ${gapNames.length === 1 ? 'dimensión en nivel' : 'dimensiones en nivel'} ${String(gapThreshold)} o menos`}
          details={{
            summary: `${names(gaps?.dimensions ?? [])} ${isAre(gaps?.dimensions ?? [])} en nivel ${String(gapThreshold)} o menos: todavía muy al inicio. Conviene atender${gapNames.length === 1 ? 'la' : 'las'} antes de seguir avanzando en las demás.`,
            dimensions: signalDimensions(gaps?.dimensions ?? []),
          }}
        >
          {chips(gaps?.dimensions ?? [])}
        </SummaryCard>
      )}
    </aside>
  );
}

import type { JSX } from 'react';
import { CircleCheck, OctagonAlert, TriangleAlert } from 'lucide-react';
import type {
  DimensionCode,
  ImbalanceClassification,
  ImbalancePairResult,
} from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { Badge } from '@/shared/ui/badge';
import { LevelBar } from '@/shared/ui/level-bar';
import type { HighlightHandler } from './MaturityProfileSummary';

/**
 * Un par de dimensiones que deberían avanzar juntas, con qué tan lejos van una
 * de la otra. La gravedad (`classification`) la calcula el backend con las
 * reglas del marco; aquí se traduce a color, icono y una frase que cualquier
 * persona entienda, sin códigos ni símbolos.
 */
interface Props {
  readonly pair: ImbalancePairResult;
  readonly names: ReadonlyMap<DimensionCode, string>;
  readonly levels: ReadonlyMap<DimensionCode, number>;
  /** Las dos dimensiones están en brecha: no hay una «adelantada» que frenar. */
  readonly bothInGap: boolean;
  readonly onHighlight?: HighlightHandler;
}

const SEVERITY: Record<
  ImbalanceClassification,
  {
    label: string;
    tone: 'critical-solid' | 'moderate' | 'acceptable';
    icon: typeof CircleCheck;
    card: string;
  }
> = {
  critical: {
    label: 'Desequilibrio crítico',
    tone: 'critical-solid',
    icon: OctagonAlert,
    card: 'border border-border border-t-[3px] border-t-critical bg-card',
  },
  moderate: {
    label: 'Desequilibrio moderado',
    tone: 'moderate',
    icon: TriangleAlert,
    card: 'border border-border bg-card',
  },
  acceptable: {
    label: 'Equilibrado',
    tone: 'acceptable',
    icon: CircleCheck,
    card: 'border border-border bg-card',
  },
};

function levelWord(n: number): string {
  return `${String(n)} ${n === 1 ? 'nivel' : 'niveles'}`;
}

function DimensionBox({
  code,
  name,
  level,
}: {
  readonly code: DimensionCode;
  readonly name: string;
  readonly level: number;
}): JSX.Element {
  const visual = getDimensionVisual(code);
  const Icon = visual.icon;
  return (
    <div className="border-border border-t pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-foreground flex min-w-0 items-center gap-1.5 text-sm font-semibold sm:gap-2 sm:text-[0.9375rem]">
          <Icon className={`${visual.textInk} size-4 shrink-0`} aria-hidden="true" />
          <span className="min-w-0">{name}</span>
        </span>
        <span className="text-foreground shrink-0 text-lg font-extrabold tabular-nums">
          {level}
        </span>
      </div>
      <LevelBar level={level} fillClass={visual.bg} className="mt-2" />
    </div>
  );
}

export function PairCard({ pair, names, levels, bothInGap, onHighlight }: Props): JSX.Element {
  const severity = SEVERITY[pair.classification];
  const Icon = severity.icon;
  const left = names.get(pair.left) ?? pair.left;
  const right = names.get(pair.right) ?? pair.right;
  const leftLevel = levels.get(pair.left) ?? 0;
  const rightLevel = levels.get(pair.right) ?? 0;
  const higher = leftLevel >= rightLevel ? left : right;
  const lower = leftLevel >= rightLevel ? right : left;

  let headline: string;
  if (pair.difference === 0) headline = 'Van exactamente al mismo nivel.';
  else headline = `${higher} va ${levelWord(pair.difference)} por delante de ${lower}.`;

  let advice: string;
  if (pair.classification === 'acceptable') {
    advice = 'Las dos avanzan a un ritmo parecido. No hace falta frenar ninguna.';
  } else if (bothInGap) {
    advice = `Las dos están en la parte baja de la escala. Lo que toca es subir ${left} y ${right} en paralelo, no compararlas entre sí.`;
  } else if (pair.classification === 'critical') {
    advice = `La distancia es muy grande. Conviene atender ${lower} antes de seguir avanzando en ${higher}.`;
  } else {
    advice = `La distancia es importante. Vale la pena acercar ${lower} a ${higher} pronto.`;
  }

  const highlight = onHighlight
    ? {
        tabIndex: 0,
        onMouseEnter: () => {
          onHighlight([pair.left, pair.right]);
        },
        onMouseLeave: () => {
          onHighlight([]);
        },
        onFocus: () => {
          onHighlight([pair.left, pair.right]);
        },
        onBlur: () => {
          onHighlight([]);
        },
      }
    : {};

  return (
    <article
      aria-label={`${left} y ${right}: ${severity.label.toLowerCase()}`}
      className={`flex flex-col gap-4 rounded-2xl p-5 sm:p-6 ${severity.card}`}
      {...highlight}
    >
      <header className="flex flex-col-reverse items-start gap-1.5">
        <h4 className="text-foreground text-lg font-bold">
          {left} y {right}
        </h4>
        <Badge tone={severity.tone}>
          <Icon className="size-4" aria-hidden="true" />
          {severity.label}
        </Badge>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <DimensionBox code={pair.left} name={left} level={leftLevel} />
        <DimensionBox code={pair.right} name={right} level={rightLevel} />
      </div>

      <div>
        <p className="text-foreground text-base font-semibold">{headline}</p>
        <p className="text-muted-foreground mt-1 text-base leading-relaxed">{advice}</p>
      </div>
    </article>
  );
}

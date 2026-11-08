import type { DimensionCode, QuestionnaireStructure } from '@innlab/contracts';
import { Button } from '@/shared/ui/button';

/**
 * `DimensionNav` — previous / next navigation between the dimensions of
 * the questionnaire.
 *
 * After answering the 8 statements of a dimension the user wants to go on
 * linearly; jumping back to the tab bar adds needless friction. The next
 * one names where it goes («Continuar con Nivel de Madurez del Cliente») and,
 * while statements are missing, it is the screen's only primary button, so
 * finishing a dimension is not read as the moment to review the summary
 * (usability tests P03, P05). With everything answered it steps down to
 * secondary: the primary is then «Revisar resumen».
 *
 * At the ends:
 *  - No previous dimension: the left button is hidden.
 *  - No next dimension: the right button leads to the first dimension with
 *    statements missing (`pendingDimension`), if any; otherwise it is
 *    hidden, and moving on to the summary is the wizard step's own action.
 */
type DimensionItem = QuestionnaireStructure['dimensions'][number];

interface Props {
  previousDimension: DimensionItem | null;
  nextDimension: DimensionItem | null;
  /** The first other dimension with statements missing, for the last tab. */
  pendingDimension?: DimensionItem | null;
  /** All 48 answered: «Continuar» is no longer the primary action. */
  allComplete?: boolean;
  onNavigate: (code: DimensionCode) => void;
}

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function DimensionNav({
  previousDimension,
  nextDimension,
  pendingDimension = null,
  allComplete = false,
  onNavigate,
}: Props) {
  const forward = nextDimension ?? pendingDimension;
  if (!previousDimension && !forward) return null;

  return (
    <nav
      aria-label="Navegación entre dimensiones"
      className="border-border mt-8 flex items-stretch justify-between gap-2 border-t pt-6 sm:items-center sm:gap-3"
    >
      {previousDimension ? (
        <Button
          variant="ghost"
          className="h-auto min-h-12 whitespace-normal py-2 text-left"
          onClick={() => onNavigate(previousDimension.code)}
          aria-label={`Ir a la dimensión anterior: ${previousDimension.name}`}
        >
          <ArrowLeftIcon />
          <span>
            <span className="text-muted-foreground font-medium">Anterior · </span>
            {previousDimension.name}
          </span>
        </Button>
      ) : (
        <span />
      )}

      {forward ? (
        <Button
          variant={allComplete ? 'secondary' : 'default'}
          className="h-auto min-h-12 whitespace-normal py-2 text-left"
          onClick={() => onNavigate(forward.code)}
        >
          <span>Continuar con {forward.name}</span>
          <ArrowRightIcon />
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}

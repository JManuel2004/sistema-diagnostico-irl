import type { DimensionCode, QuestionnaireStructure } from '@innlab/contracts';
import { Button } from '@/shared/ui/button';

/**
 * `DimensionNav` — previous / next navigation between the dimensions of
 * the questionnaire.
 *
 * After answering the 8 statements of a dimension the user wants to go on
 * linearly; jumping back to the tab bar adds needless friction. The button
 * shows the full name of the next dimension so the context is explicit
 * ("Siguiente · Modelo de negocio").
 *
 * At the ends:
 *  - No previous dimension: the left button is hidden.
 *  - No next dimension: the right button is hidden; moving on to the
 *    summary is the wizard step's own action.
 */
type DimensionItem = QuestionnaireStructure['dimensions'][number];

interface Props {
  previousDimension: DimensionItem | null;
  nextDimension: DimensionItem | null;
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

export function DimensionNav({ previousDimension, nextDimension, onNavigate }: Props) {
  if (!previousDimension && !nextDimension) return null;

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

      {nextDimension ? (
        <Button
          variant="secondary"
          className="h-auto min-h-12 whitespace-normal py-2 text-left"
          onClick={() => onNavigate(nextDimension.code)}
          aria-label={`Ir a la siguiente dimensión: ${nextDimension.name}`}
        >
          <span>
            <span className="text-muted-foreground font-medium">Siguiente · </span>
            {nextDimension.name}
          </span>
          <ArrowRightIcon />
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}

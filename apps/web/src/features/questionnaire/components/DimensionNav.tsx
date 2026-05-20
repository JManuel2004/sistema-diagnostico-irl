import type { DimensionCode, QuestionnaireStructure } from '@innlab/contracts';
import { Button } from '@/shared/ui/button';

/**
 * `DimensionNav` — navegación inferior previa / siguiente entre
 * dimensiones del cuestionario.
 *
 * Adoptado del prototipo cliente: tras responder los 8 ítems de una
 * dimensión el usuario quiere continuar linealmente. Saltar de vuelta
 * a la barra de pestañas añade fricción innecesaria. El botón muestra
 * el nombre completo de la siguiente dimensión para que el contexto
 * sea explícito ("Siguiente · Modelo de negocio").
 *
 * En los extremos:
 *  - Sin dimensión previa: ocultamos el botón izquierdo (no
 *    sustituimos con "volver al inicio" porque la HU de creación de
 *    diagnóstico aún no existe — sería una promesa rota).
 *  - Sin dimensión siguiente: ocultamos el botón derecho. La acción
 *    de "Generar diagnóstico" pertenece a una HU posterior y no se
 *    pinta hasta entonces.
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
      className="border-border mt-8 flex items-center justify-between gap-3 border-t pt-6"
    >
      {previousDimension ? (
        <Button
          variant="ghost"
          onClick={() => onNavigate(previousDimension.code)}
          aria-label={`Ir a la dimensión anterior: ${previousDimension.name}`}
        >
          <ArrowLeftIcon />
          <span>
            <span className="text-muted-foreground text-xs">Anterior · </span>
            {previousDimension.name}
          </span>
        </Button>
      ) : (
        <span />
      )}

      {nextDimension ? (
        <Button
          variant="secondary"
          onClick={() => onNavigate(nextDimension.code)}
          aria-label={`Ir a la siguiente dimensión: ${nextDimension.name}`}
        >
          <span>
            <span className="text-muted-foreground text-xs">Siguiente · </span>
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

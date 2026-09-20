import { useState, type JSX, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from './card';

/**
 * `DisclosurePanel` — panel plegable de explicación.
 *
 * Es el patrón de «cómo se llegó a esto»: colapsado por defecto porque no
 * es lo que el usuario necesita en primer plano, accesible sin cambiar de
 * pantalla. Lo usan la traza de la recomendación y la explicación del
 * roadmap para que las dos pantallas expliquen igual.
 *
 * El contenido queda montado aunque esté plegado (`hidden`), así que
 * `onOpen` sirve para pedir datos pesados solo cuando alguien abre el
 * panel.
 */
interface DisclosurePanelProps {
  /** Identificador del bloque de contenido, para `aria-controls`. */
  readonly id: string;
  readonly title: string;
  /** Texto pequeño a la derecha del título (p. ej. la audiencia). */
  readonly tag?: string;
  readonly onOpen?: () => void;
  readonly children: ReactNode;
}

export function DisclosurePanel({
  id,
  title,
  tag,
  onOpen,
  children,
}: DisclosurePanelProps): JSX.Element {
  const [open, setOpen] = useState(false);

  function toggle(): void {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
  }

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <section className="mt-8">
      <Card>
        <h2>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={id}
            className="text-foreground flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-semibold"
          >
            <Chevron className="size-4 shrink-0" aria-hidden="true" />
            {title}
            {tag !== undefined && (
              <span className="text-muted-foreground ml-auto text-xs font-normal">{tag}</span>
            )}
          </button>
        </h2>
        <div id={id} hidden={!open} className="px-5 pb-6">
          {children}
        </div>
      </Card>
    </section>
  );
}

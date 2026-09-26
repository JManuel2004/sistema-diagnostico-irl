import { useState, type JSX, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

/**
 * `DisclosurePanel` — collapsible explanation panel.
 *
 * It is the "how we got here" pattern: collapsed by default because it is
 * not what the user needs up front, reachable without changing screens.
 * The recommendation trace and the roadmap explanation use it so both
 * explain the same way.
 *
 * The content stays mounted while collapsed (`hidden`), so `onOpen` serves
 * to request heavy data only when someone opens the panel.
 */
interface DisclosurePanelProps {
  /** Identifier of the content block, for `aria-controls`. */
  readonly id: string;
  readonly title: string;
  /** Text to the right of the title (e.g. the audience). */
  readonly tag?: string;
  /** Icon to the left of the title, so the panel reads as an invitation. */
  readonly icon?: LucideIcon;
  readonly onOpen?: () => void;
  readonly children: ReactNode;
}

export function DisclosurePanel({
  id,
  title,
  tag,
  icon: Icon,
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
            className="text-foreground flex w-full items-center gap-3 px-5 py-4 text-left text-base font-semibold"
          >
            {Icon !== undefined && (
              <Icon className="text-azul-icesi size-5 shrink-0" aria-hidden="true" />
            )}
            {title}
            {tag !== undefined && (
              <span className="text-muted-foreground ml-auto text-sm font-normal">{tag}</span>
            )}
            <Chevron
              className={`size-5 shrink-0 ${tag === undefined ? 'ml-auto' : ''}`}
              aria-hidden="true"
            />
          </button>
        </h2>
        <div id={id} hidden={!open} className="px-5 pb-6">
          {children}
        </div>
      </Card>
    </section>
  );
}

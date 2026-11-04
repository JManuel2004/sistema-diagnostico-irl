import type { JSX, ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * `SectionHeader` — title of a section inside a page (`h2`), with its
 * description and, below, the result metadata (`ResultMeta`). It is to
 * sections what `PageHeader` is to the page.
 *
 * With `icon`, the title carries on its left an Azul Icesi circle with the
 * icon in white, like innlab.org's cards.
 *
 * With `toggle`, the title is the button that folds the section (the
 * WAI-ARIA accordion pattern: a button inside the heading, with
 * `aria-expanded` and `aria-controls`). Enter and Space work natively.
 */
interface SectionToggle {
  readonly expanded: boolean;
  /** Id of the element the button shows or hides. */
  readonly controls: string;
  readonly onToggle: () => void;
}

interface SectionHeaderProps {
  /** Identifier of the `h2`, so the section uses it in `aria-labelledby`. */
  readonly id?: string;
  readonly title: string;
  readonly overline?: string;
  /** Tone of the overline: `critical` for the alerts. */
  readonly tone?: 'default' | 'critical';
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly toggle?: SectionToggle;
  readonly children?: ReactNode;
}

export function SectionHeader({
  id,
  title,
  overline,
  tone = 'default',
  description,
  icon: Icon,
  toggle,
  children,
}: SectionHeaderProps): JSX.Element {
  return (
    <header className="mb-6 flex gap-4 sm:mb-8 sm:gap-5">
      {Icon && (
        <span
          aria-hidden="true"
          className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12"
        >
          <Icon className="size-5 sm:size-6" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {overline && (
          // No `cn`: tailwind-merge would take `text-eyebrow` for a color and drop it.
          <p className={`text-eyebrow mb-2${tone === 'critical' ? '!text-critical' : ''}`}>
            {overline}
          </p>
        )}
        <h2 id={id} className="text-h2 text-foreground max-sm:text-[1.625rem]">
          {toggle ? (
            <button
              type="button"
              aria-expanded={toggle.expanded}
              aria-controls={toggle.controls}
              onClick={toggle.onToggle}
              className="focus-visible:outline-ring flex w-full items-start justify-between gap-3 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span>{title}</span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'text-muted-foreground mt-1 size-6 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                  toggle.expanded && 'rotate-180',
                )}
              />
            </button>
          ) : (
            title
          )}
        </h2>
        {description !== undefined && (
          <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}

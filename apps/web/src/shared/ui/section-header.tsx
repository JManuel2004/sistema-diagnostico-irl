import type { JSX, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * `SectionHeader` — title of a section inside a page (`h2`), with its
 * description and, below, the result metadata (`ResultMeta`). It is to
 * sections what `PageHeader` is to the page.
 *
 * With `icon`, the title carries on its left an Azul Icesi circle with the
 * icon in white, like innlab.org's cards.
 */
interface SectionHeaderProps {
  /** Identifier of the `h2`, so the section uses it in `aria-labelledby`. */
  readonly id?: string;
  readonly title: string;
  readonly overline?: string;
  /** Tone of the overline: `critical` for the alerts. */
  readonly tone?: 'default' | 'critical';
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly children?: ReactNode;
}

export function SectionHeader({
  id,
  title,
  overline,
  tone = 'default',
  description,
  icon: Icon,
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
          {title}
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

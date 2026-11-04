import type { JSX, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * `PageHeader` — title block of every screen: overline, title (`text-h1`,
 * the `DESIGN.md` scale), description and, if any, the result metadata. It
 * exists so no page writes its own title size or spacing.
 */
interface PageHeaderProps {
  /** Overline. Omitted in the wizard: the step indicator already says where the user is. */
  readonly overline?: string;
  readonly title: string;
  readonly description?: string;
  /**
   * The description spans the content's width instead of a reading measure:
   * for a screen whose content is wide, so the text lines up with it.
   */
  readonly fullWidthDescription?: boolean;
  /** Below the description: e.g. `ResultMeta`. */
  readonly children?: ReactNode;
}

export function PageHeader({
  overline,
  title,
  description,
  fullWidthDescription = false,
  children,
}: PageHeaderProps): JSX.Element {
  return (
    <header className="mb-8 sm:mb-10">
      {overline !== undefined && <p className="text-eyebrow mb-3">{overline}</p>}
      <h1 className="text-h1 text-foreground max-sm:text-[1.875rem]">{title}</h1>
      {description !== undefined && (
        <p
          className={cn(
            'text-muted-foreground mt-3 text-base leading-relaxed sm:text-lg',
            !fullWidthDescription && 'max-w-prose',
          )}
        >
          {description}
        </p>
      )}
      {children}
    </header>
  );
}

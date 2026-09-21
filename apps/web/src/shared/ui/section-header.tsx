import type { JSX, ReactNode } from 'react';

/**
 * `SectionHeader` — título de una sección dentro de una página (`h2`), con su
 * descripción y, debajo, el metadato del resultado (`ResultMeta`). Es a las
 * secciones lo que `PageHeader` es a la página.
 */
interface SectionHeaderProps {
  /** Identificador del `h2`, para que la sección lo use en `aria-labelledby`. */
  readonly id?: string;
  readonly title: string;
  readonly overline?: string;
  readonly description?: string;
  readonly children?: ReactNode;
}

export function SectionHeader({
  id,
  title,
  overline,
  description,
  children,
}: SectionHeaderProps): JSX.Element {
  return (
    <header className="mb-6">
      {overline && <p className="text-azul-icesi text-sm font-bold">{overline}</p>}
      <h2 id={id} className="text-foreground mt-1 text-2xl font-bold leading-tight tracking-tight">
        {title}
      </h2>
      {description !== undefined && (
        <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}

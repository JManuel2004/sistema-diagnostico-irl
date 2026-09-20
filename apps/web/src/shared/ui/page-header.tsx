import type { JSX, ReactNode } from 'react';

/**
 * `PageHeader` — bloque de título de cada pantalla: sobretítulo, título
 * (`text-h1`, la escala de `DESIGN.md`), descripción y, si aplica, el
 * metadato del resultado. Existe para que ninguna página escriba su propio
 * tamaño de título ni su propio espaciado.
 */
interface PageHeaderProps {
  readonly overline: string;
  readonly title: string;
  readonly description?: string;
  /** Debajo de la descripción: p. ej. `ResultMeta`. */
  readonly children?: ReactNode;
}

export function PageHeader({
  overline,
  title,
  description,
  children,
}: PageHeaderProps): JSX.Element {
  return (
    <header className="mb-8">
      <p className="text-overline text-azul-icesi">{overline}</p>
      <h1 className="text-h1 text-foreground mt-2">{title}</h1>
      {description !== undefined && (
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}

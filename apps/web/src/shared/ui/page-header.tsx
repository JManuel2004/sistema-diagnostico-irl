import type { JSX, ReactNode } from 'react';

/**
 * `PageHeader` — bloque de título de cada pantalla: sobretítulo, título
 * (`text-h1`, la escala de `DESIGN.md`), descripción y, si aplica, el
 * metadato del resultado. Existe para que ninguna página escriba su propio
 * tamaño de título ni su propio espaciado.
 */
interface PageHeaderProps {
  /** Sobretítulo. En el asistente se omite: el indicador de pasos ya dice dónde se está. */
  readonly overline?: string;
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
    <header className="mb-8 sm:mb-10">
      {overline !== undefined && <p className="text-eyebrow mb-3">{overline}</p>}
      <h1 className="text-h1 text-foreground max-sm:text-[1.875rem]">{title}</h1>
      {description !== undefined && (
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed sm:text-lg">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}

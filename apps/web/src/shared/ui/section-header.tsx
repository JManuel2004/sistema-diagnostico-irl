import type { JSX, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * `SectionHeader` — título de una sección dentro de una página (`h2`), con su
 * descripción y, debajo, el metadato del resultado (`ResultMeta`). Es a las
 * secciones lo que `PageHeader` es a la página.
 *
 * Con `icon`, el título lleva a su izquierda un círculo Azul Icesi con el icono
 * en blanco, como las tarjetas de innlab.org.
 */
interface SectionHeaderProps {
  /** Identificador del `h2`, para que la sección lo use en `aria-labelledby`. */
  readonly id?: string;
  readonly title: string;
  readonly overline?: string;
  /** Tono del sobretítulo: `critical` para las alertas. */
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
          // Sin `cn`: tailwind-merge tomaría `text-eyebrow` por un color y la quitaría.
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

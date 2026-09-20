import type { JSX } from 'react';
import { GLOSSARY, type GlossaryKey } from '@/shared/lib/glossary';
import { Tooltip } from './tooltip';

/**
 * Un término técnico con su explicación en un `Tooltip`.
 *
 * Es un botón (no un `span`) para que se pueda enfocar con el teclado y el
 * tooltip aparezca también sin ratón; el subrayado punteado avisa de que hay
 * una explicación.
 */
interface GlossaryTermProps {
  readonly term: GlossaryKey;
  /** Texto visible si debe distinguirse del término del glosario (p. ej. «brechas»). */
  readonly children?: string;
  readonly className?: string;
}

export function GlossaryTerm({ term, children, className }: GlossaryTermProps): JSX.Element {
  const entry = GLOSSARY[term];
  return (
    <Tooltip content={entry.explanation}>
      <button
        type="button"
        className={
          className ??
          'cursor-help underline decoration-dotted underline-offset-4 focus-visible:rounded-sm'
        }
      >
        {children ?? entry.term}
      </button>
    </Tooltip>
  );
}

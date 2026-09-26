import type { JSX } from 'react';
import { GLOSSARY, type GlossaryKey } from '@/shared/lib/glossary';
import { Tooltip } from './tooltip';

/**
 * A technical term with its explanation in a `Tooltip`.
 *
 * It is a button (not a `span`) so it can be focused with the keyboard and
 * the tooltip also appears without a mouse; the dotted underline signals
 * there is an explanation.
 */
interface GlossaryTermProps {
  readonly term: GlossaryKey;
  /** Visible text, if it must differ from the glossary term (e.g. «brechas»). */
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

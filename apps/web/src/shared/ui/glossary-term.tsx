import { useState, type JSX } from 'react';
import { Info } from 'lucide-react';
import { GLOSSARY, type GlossaryKey } from '@/shared/lib/glossary';
import { Tooltip } from './tooltip';

/**
 * A technical term with its explanation in a `Tooltip`: what the term is
 * and what it implies for the user's initiative.
 *
 * It is a button (not a `span`) so it can be focused with the keyboard and
 * the tooltip also appears without a mouse. An info icon next to the dotted
 * underline signals there is an explanation, and a click or a tap opens it
 * too: the hover alone went unnoticed (usability test P05). The click does
 * not reach the card around it.
 */
interface GlossaryTermProps {
  readonly term: GlossaryKey;
  /** Visible text, if it must differ from the glossary term (e.g. «brechas»). */
  readonly children?: string;
  readonly className?: string;
}

export function GlossaryTerm({ term, children, className }: GlossaryTermProps): JSX.Element {
  const entry = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      open={open}
      onOpenChange={setOpen}
      content={
        <>
          {entry.explanation} {entry.forYou}
        </>
      }
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((shown) => !shown);
        }}
        className={
          className ??
          'inline-flex cursor-help items-center gap-1 underline decoration-dotted underline-offset-4 focus-visible:rounded-sm'
        }
      >
        {children ?? entry.term}
        <Info className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

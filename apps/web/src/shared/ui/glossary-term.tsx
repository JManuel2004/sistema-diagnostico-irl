import { useState, type JSX, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { GLOSSARY, type GlossaryKey } from '@/shared/lib/glossary';
import { cn } from '@/shared/lib/utils';
import { Tooltip } from './tooltip';

/**
 * A word with its explanation in a `Tooltip`.
 *
 * It is a button (not a `span`) so it can be focused with the keyboard and
 * the tooltip also appears without a mouse. An info icon next to the dotted
 * underline signals there is an explanation, and a click or a tap opens it
 * too: the hover alone went unnoticed (usability test P05). The click does
 * not reach the card around it.
 */
interface TermTooltipProps {
  readonly explanation: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function TermTooltip({ explanation, children, className }: TermTooltipProps): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen} content={explanation}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((shown) => !shown);
        }}
        className={cn(
          'inline-flex cursor-help items-center gap-1 underline decoration-dotted underline-offset-4 focus-visible:rounded-sm',
          className,
        )}
      >
        {children}
        <Info
          className="inline-block size-3.5 shrink-0 align-[-0.1em] opacity-80"
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  );
}

/**
 * A technical term of the IRL framework with its explanation: what the term
 * is and what it implies for the user's initiative (`GLOSSARY`).
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
    <TermTooltip
      className={className}
      explanation={
        <>
          {entry.explanation} {entry.forYou}
        </>
      }
    >
      {children ?? entry.term}
    </TermTooltip>
  );
}

import { useEffect, useRef, useState, type JSX, type KeyboardEvent, type Ref } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { InitiativeStage } from '@innlab/contracts';
import { cn } from '@/shared/lib/utils';

/** What each stage of the catalog means, in the user's words, by its code. */
const STAGE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  idea: 'Todavía es un concepto: aún no la has probado con usuarios o clientes.',
  validacion: 'La estás probando con usuarios o clientes para confirmar que funciona.',
  crecimiento: 'Ya opera con clientes y busca escalar.',
};

interface Props {
  readonly stages: readonly InitiativeStage[];
  /** The chosen stage's id, or `''`. */
  readonly value: string;
  readonly onChange: (stageId: string) => void;
  readonly onBlur?: () => void;
  /** From `Field`: ties the control to its label, hint and error. */
  readonly id: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: boolean;
  readonly className?: string;
  /** The form focuses the control through it when it has an error. */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * The stage of the initiative as a list whose options say what each stage
 * means, under its name, the way the sector list does. A native `<select>`
 * cannot show that second line.
 *
 * It follows the WAI-ARIA select-only combobox pattern: the button keeps the
 * focus and the options are a `listbox` it points to with
 * `aria-activedescendant`. ↑/↓ open the list and move, Enter or Space
 * choose, Escape closes and keeps the choice. Closed, it shows only the
 * chosen stage's name.
 */
export function StageSelect({
  stages,
  value,
  onChange,
  onBlur,
  id,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ref,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  const selected = stages.find((s) => s.id === value);
  const listId = `${id}-listbox`;
  const optionId = (index: number): string => `${id}-option-${String(index)}`;

  useEffect(() => {
    if (open) popupRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [open]);

  function openList(): void {
    const index = stages.findIndex((s) => s.id === value);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  }

  function choose(stage: InitiativeStage): void {
    onChange(stage.id);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((current) => (current + step + stages.length) % stages.length);
        return;
      }
      case 'Enter':
      case ' ':
        // Choosing must not submit the form.
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        {
          const option = stages.at(active);
          if (option) choose(option);
        }
        return;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      default:
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={ref}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onClick={() => {
          if (open) setOpen(false);
          else openList();
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        className={cn(
          'border-input bg-background rounded-control flex h-12 w-full cursor-pointer items-center border pl-3.5 pr-11 text-left text-base',
          selected ? 'text-foreground' : 'text-muted-foreground',
          invalid && 'border-critical',
        )}
      >
        {selected?.name ?? 'Selecciona una etapa'}
      </button>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'text-muted-foreground pointer-events-none absolute right-3.5 top-3.5 size-5 transition-transform',
          open && 'rotate-180',
        )}
      />

      <div
        ref={popupRef}
        className={cn(
          'border-border bg-card rounded-control absolute inset-x-0 top-[3.25rem] z-30 overflow-hidden border shadow-[0_12px_32px_-12px_rgba(43,43,61,0.35)]',
          !open && 'hidden',
        )}
      >
        <ul id={listId} role="listbox" aria-label="Etapas de la iniciativa" className="py-1">
          {stages.map((stage, index) => {
            const description = STAGE_DESCRIPTIONS[stage.code];
            const isSelected = stage.id === value;
            return (
              <li
                key={stage.id}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-labelledby={`${optionId(index)}-name`}
                aria-describedby={description ? `${optionId(index)}-description` : undefined}
                // Chosen on press, keeping the focus on the button.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(stage);
                }}
                onMouseMove={() => {
                  if (index !== active) setActive(index);
                }}
                className={cn(
                  'flex cursor-pointer items-start gap-3 px-3.5 py-3',
                  index === active ? 'bg-surface-muted' : 'bg-card',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span
                    id={`${optionId(index)}-name`}
                    className="text-foreground block text-[0.9375rem] font-medium leading-snug"
                  >
                    {stage.name}
                  </span>
                  {description && (
                    <span
                      id={`${optionId(index)}-description`}
                      className="text-muted-foreground mt-1 block text-sm leading-relaxed"
                    >
                      {description}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check className="text-azul-icesi mt-0.5 size-4 shrink-0" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

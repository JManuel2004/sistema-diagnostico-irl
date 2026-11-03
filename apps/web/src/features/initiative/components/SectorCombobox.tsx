import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { Check, ChevronDown, PenLine, Search } from 'lucide-react';
import type { SectorOption } from '@innlab/contracts';
import { cn } from '@/shared/lib/utils';
import { searchSectors } from '../lib/sector-search';

interface Props {
  /** The catalog: the CIIU sections by code and «Otro» last. */
  readonly sectors: readonly SectorOption[];
  /** The chosen sector's id, or `''`. */
  readonly value: string;
  readonly onChange: (sectorId: string) => void;
  readonly onBlur?: () => void;
  /** From `Field`: ties the input to its label, hint and error. */
  readonly id: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: boolean;
  readonly className?: string;
}

/**
 * The sector of the initiative as a searchable list (combobox): the 22
 * sections of the CIIU Rev. 5 A.C., each with its code, its official title
 * and, under it, a line on what it groups (a title like «Otras actividades
 * de servicios» does not say it), and «Otro sector (especificar)» always
 * last, apart.
 *
 * It follows the WAI-ARIA combobox pattern: the input keeps the focus and
 * the options are a `listbox` it points to with `aria-activedescendant`.
 * Typing filters (`searchSectors`: code, title, related words and that
 * line, without accents); ↑/↓ move, Enter chooses, Escape closes and keeps
 * the choice. The list scrolls inside a box of at most 24rem (half the
 * window on a short screen), under the field and over the form, so it never
 * takes the whole page; opening it scrolls the page just enough to show it. Closed, the field shows the chosen sector with its code and,
 * under it, its full title, which a long section does not fit in the input.
 */
export function SectorCombobox({
  sectors,
  value,
  onChange,
  onBlur,
  id,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  const selected = sectors.find((s) => s.id === value);
  const { matches, other } = useMemo(() => searchSectors(sectors, query), [sectors, query]);
  const items = useMemo(() => (other ? [...matches, other] : [...matches]), [matches, other]);
  const listId = `${id}-listbox`;
  const optionId = (index: number): string => `${id}-option-${String(index)}`;

  // Opened near the bottom of the window, the page scrolls just enough to
  // show the whole list: on a short laptop screen it would end out of sight.
  useEffect(() => {
    if (open) popupRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [open]);

  // The active option stays in sight while moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${id}-option-${String(active)}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, id]);

  function openList(): void {
    setQuery('');
    const index = items.findIndex((s) => s.id === value);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  }

  function choose(sector: SectorOption): void {
    onChange(sector.id);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        if (items.length === 0) return;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((current) => (current + step + items.length) % items.length);
        return;
      }
      case 'Enter':
        // Choosing must not submit the form.
        if (open) {
          event.preventDefault();
          const option = items.at(active);
          if (option) choose(option);
        }
        return;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
          setQuery('');
        }
        return;
      default:
    }
  }

  const shown = open ? query : (selected?.name ?? '');
  const otherIndex = other ? items.length - 1 : -1;

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        {!open && selected ? (
          <SectorBadge sector={selected} className="absolute left-2.5 top-1/2 -translate-y-1/2" />
        ) : (
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2"
          />
        )}
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && items.length > 0 ? optionId(active) : undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          placeholder="Buscar sector o actividad económica…"
          value={shown}
          title={!open && selected ? selected.name : undefined}
          onFocus={openList}
          onClick={() => {
            if (!open) openList();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setOpen(false);
            setQuery('');
            onBlur?.();
          }}
          className={cn(
            'border-input bg-background text-foreground placeholder:text-muted-foreground rounded-control h-12 w-full truncate border pr-11 text-base',
            !open && selected ? 'pl-[3.25rem] font-semibold' : 'pl-11',
            invalid && 'border-critical',
          )}
        />
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'text-muted-foreground pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 transition-transform',
            open && 'rotate-180',
          )}
        />
      </div>

      {!open && selected && !selected.isOther && (
        <p className="text-foreground mt-2 text-sm leading-snug">
          <span className="text-muted-foreground">Sección {selected.code} · </span>
          {selected.name}
        </p>
      )}

      <div
        ref={popupRef}
        className={cn(
          'border-border bg-card rounded-control absolute inset-x-0 top-[3.25rem] z-30 overflow-hidden border shadow-[0_12px_32px_-12px_rgba(43,43,61,0.35)]',
          !open && 'hidden',
        )}
      >
        <ul
          id={listId}
          role="listbox"
          aria-label="Sectores económicos"
          className="max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain py-1"
        >
          {matches.length === 0 && (
            <li role="presentation" className="text-muted-foreground px-3.5 py-3 text-sm">
              No encontramos un sector con «{query.trim()}». Prueba con otra palabra o elige «Otro
              sector» y descríbelo.
            </li>
          )}
          {items.map((sector, index) => {
            const isActive = index === active;
            const isSelected = sector.id === value;
            return (
              <li
                key={sector.id}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                // Named by its title; the line under it is its description.
                aria-labelledby={`${optionId(index)}-name`}
                aria-describedby={sector.description ? `${optionId(index)}-description` : undefined}
                // Chosen on press, keeping the focus in the input (the
                // keyboard is the input's, as the combobox pattern asks).
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(sector);
                }}
                onMouseMove={() => {
                  if (!isActive) setActive(index);
                }}
                className={cn(
                  'flex cursor-pointer items-start gap-3 px-3.5 py-3',
                  index === otherIndex && 'border-border mt-1 border-t pt-3.5',
                  isActive ? 'bg-surface-muted' : 'bg-card',
                )}
              >
                <SectorBadge sector={sector} />
                <span className="min-w-0 flex-1">
                  <span
                    id={`${optionId(index)}-name`}
                    className="text-foreground block text-[0.9375rem] font-medium leading-snug"
                  >
                    {sector.name}
                  </span>
                  {sector.description && (
                    <span
                      id={`${optionId(index)}-description`}
                      className="text-muted-foreground mt-1 block text-sm leading-relaxed"
                    >
                      {sector.description}
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
        <p className="border-border text-muted-foreground border-t px-3.5 py-2 text-xs">
          Secciones de la CIIU Rev. 5 A.C. del DANE
        </p>
      </div>
    </div>
  );
}

/** The section's code in a square, or a pencil for «Otro». */
function SectorBadge({
  sector,
  className,
}: {
  readonly sector: SectorOption;
  readonly className?: string;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-azul-wash text-azul-icesi flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-extrabold',
        className,
      )}
    >
      {sector.code ?? <PenLine className="size-4" />}
    </span>
  );
}

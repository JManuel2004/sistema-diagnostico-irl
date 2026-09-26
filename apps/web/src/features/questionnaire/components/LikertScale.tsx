import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { cn } from '@/shared/lib/utils';
import { LIKERT_OPTIONS } from '../lib/likert-options';
import type { LikertValue } from '@innlab/contracts';

/**
 * `LikertScale` — a 1..5 scale over `RadioGroup` (shadcn / Radix).
 *
 * - Radix provides the keyboard handling (arrows, Space) and the ARIA roles
 *   (`radiogroup`, `radio`) for free.
 * - The selected state is announced with **three signals** besides color:
 *   a fill with a white dot, a light ring and a bold label — color is never
 *   the only signal.
 * - Each option is a `<label>` that wraps the circle and its text: the
 *   whole column (≥96px high) is the touch target, not just the circle.
 * - It is tied to the statement's text with `aria-labelledby={id}`; no
 *   extra `aria-label` is added so the screen reader's voice is not
 *   duplicated.
 */
interface Props {
  /** id of the element that holds the statement's text */
  id: string;
  value: LikertValue | null;
  onChange: (value: LikertValue) => void;
}

export function LikertScale({ id, value, onChange }: Props) {
  // Radix requires a defined `value` for the whole life of the component so
  // it does not flip between controlled and uncontrolled mode. `""` is
  // the "no selection" sentinel (Radix reads it as "no option matches");
  // `onValueChange` never fires with an empty string, so
  // `Number("") === 0` never reaches `onChange`.
  const controlledValue = value === null ? '' : String(value);

  return (
    <RadioGroup
      aria-labelledby={id}
      className="mt-5 grid grid-cols-5 gap-1 sm:gap-2"
      value={controlledValue}
      onValueChange={(v) => onChange(Number(v))}
    >
      {LIKERT_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const itemId = `${id}-option-${String(opt.value)}`;
        return (
          // The whole column responds to touch, not just the circle.
          <label
            key={opt.value}
            htmlFor={itemId}
            className="flex min-h-[6.5rem] cursor-pointer flex-col items-center gap-2.5 rounded-lg px-1 py-3 text-center sm:min-h-24"
          >
            <RadioGroupItem
              id={itemId}
              value={String(opt.value)}
              aria-label={`${opt.value} — ${opt.label}`}
              className={cn(
                'size-7 shrink-0 border-2 transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground ring-primary/20 ring-4 ring-offset-0'
                  : 'border-input bg-background hover:border-primary/60',
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                'text-xs leading-tight transition-colors sm:text-[0.8125rem]',
                isSelected ? 'text-primary font-bold' : 'text-muted-foreground font-medium',
              )}
            >
              {opt.label}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

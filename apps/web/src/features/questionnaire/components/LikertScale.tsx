import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { cn } from '@/shared/lib/utils';
import { LIKERT_OPTIONS } from '../lib/likert-options';
import type { LikertValue } from '@innlab/contracts';

/**
 * `LikertScale` — escala 1..5 sobre `RadioGroup` (shadcn / Radix).
 *
 * - Radix proporciona el manejo de teclado (flechas, Space) y los
 *   roles ARIA (`radiogroup`, `radio`) gratis.
 * - El estado seleccionado se anuncia con **tres señales** además del
 *   color: relleno con punto blanco, anillo claro y etiqueta en negrita —
 *   satisface NF-3 (color nunca como única señal) de SPEC-STORY2.
 * - Cada opción es un `<label>` que envuelve el círculo y su texto: toda la
 *   columna (≥96px de alto) es el objetivo táctil, no solo el círculo.
 * - Se asocia al texto de la afirmación con `aria-labelledby={id}`;
 *   no se añade `aria-label` adicional para no duplicar la voz del
 *   lector de pantalla.
 */
interface Props {
  /** id del elemento que contiene el texto de la afirmación */
  id: string;
  value: LikertValue | null;
  onChange: (value: LikertValue) => void;
}

export function LikertScale({ id, value, onChange }: Props) {
  // Radix exige un `value` definido durante toda la vida del componente
  // para no oscilar entre modo controlado/no-controlado. Usamos `""`
  // como centinela de "sin selección" (Radix lo entiende como "ninguna
  // opción coincide"); el `onValueChange` nunca dispara con cadena
  // vacía, así que `Number("") === 0` jamás llega a `onChange`.
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
          // Toda la columna responde al toque, no solo el círculo.
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

export default LikertScale;

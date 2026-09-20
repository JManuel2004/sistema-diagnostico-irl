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
 *   color: relleno, borde reforzado y anillo de foco — satisface
 *   NF-3 (color nunca como única señal) de SPEC-STORY2.
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
      className="mt-4 grid grid-cols-5 gap-3"
      value={controlledValue}
      onValueChange={(v) => onChange(Number(v))}
    >
      {LIKERT_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <div key={opt.value} className="flex flex-col items-center gap-2 text-center">
            <RadioGroupItem
              value={String(opt.value)}
              aria-label={`${opt.value} — ${opt.label}`}
              className={cn(
                'h-6 w-6 transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground ring-primary/30 border-2 ring-2 ring-offset-2'
                  : 'border-input hover:border-primary/60 border-2',
              )}
            />
            <span
              className={cn(
                'min-h-10 text-xs leading-tight transition-colors',
                isSelected ? 'text-primary font-semibold' : 'text-muted-foreground',
              )}
            >
              {opt.label}
            </span>
          </div>
        );
      })}
    </RadioGroup>
  );
}

export default LikertScale;

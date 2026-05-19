import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import type { LikertValue } from '@innlab/contracts';

interface Props {
  /** id used to associate the radiogroup with the statement text */
  id: string;
  value: LikertValue | null;
  onChange: (value: LikertValue) => void;
}

const OPTIONS: { value: LikertValue; label: string }[] = [
  { value: 1, label: 'Totalmente en desacuerdo' },
  { value: 2, label: 'En desacuerdo' },
  { value: 3, label: 'Ni de acuerdo ni en desacuerdo' },
  { value: 4, label: 'De acuerdo' },
  { value: 5, label: 'Totalmente de acuerdo' },
];

export function LikertScale({ id, value, onChange }: Props) {
  return (
    <RadioGroup
      aria-labelledby={id}
      aria-label="Escala Likert"
      className="mt-4 grid grid-cols-5 gap-3"
      value={value ? String(value) : undefined}
      onValueChange={(v) => onChange(Number(v))}
    >
      {OPTIONS.map((opt) => (
        <div key={opt.value} className="flex flex-col items-center gap-2 text-center">
          <RadioGroupItem value={String(opt.value)} aria-label={opt.label} />
          <span className="text-muted-foreground min-h-10 text-xs leading-tight">{opt.label}</span>
        </div>
      ))}
    </RadioGroup>
  );
}

export default LikertScale;

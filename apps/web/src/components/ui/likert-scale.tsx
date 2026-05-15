import * as RadioGroup from '@radix-ui/react-radio-group';
import type { LikertValue } from '@innlab/contracts';

const OPTIONS: { value: LikertValue; label: string }[] = [
  { value: 1, label: 'Totalmente en desacuerdo' },
  { value: 2, label: 'En desacuerdo' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'De acuerdo' },
  { value: 5, label: 'Totalmente de acuerdo' },
];

interface LikertScaleProps {
  value: number | null | undefined;
  onChange: (value: LikertValue) => void;
  name: string;
}

export function LikertScale({ value, onChange, name }: LikertScaleProps) {
  return (
    <RadioGroup.Root
      name={name}
      value={value != null ? String(value) : ''}
      onValueChange={(v) => onChange(parseInt(v, 10) as LikertValue)}
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <RadioGroup.Item
            key={opt.value}
            value={String(opt.value)}
            aria-label={opt.label}
            title={opt.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 0.75rem',
              border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-gray-200)'}`,
              borderRadius: 'var(--radius-md)',
              background: selected ? 'var(--color-primary-50)' : 'var(--color-white)',
              color: selected ? 'var(--color-primary-dark)' : 'var(--color-gray-600)',
              fontFamily: 'var(--font-sans)',
              fontWeight: selected ? 'var(--font-semibold)' : 'var(--font-normal)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              minWidth: '4.5rem',
              outline: 'none',
            }}
          >
            <RadioGroup.Indicator
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: selected ? 'var(--color-primary)' : 'transparent',
                border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-gray-400)'}`,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 'var(--text-xs)', textAlign: 'center', lineHeight: 1.2 }}>
              {opt.label}
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}

import * as RadioGroup from '@radix-ui/react-radio-group';
import type { LikertValue } from '@innlab/contracts';

const VALUES: LikertValue[] = [1, 2, 3, 4, 5];

interface LikertScaleProps {
  value: number | null | undefined;
  onChange: (value: LikertValue) => void;
  name: string;
}

export function LikertScale({ value, onChange, name }: LikertScaleProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <RadioGroup.Root
        name={name}
        value={value != null ? String(value) : ''}
        onValueChange={(v) => onChange(parseInt(v, 10) as LikertValue)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-gray-600)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            maxWidth: '7rem',
            lineHeight: 1.2,
          }}
        >
          Totalmente en desacuerdo
        </span>

        {VALUES.map((val) => {
          const selected = value === val;
          return (
            <RadioGroup.Item
              key={val}
              value={String(val)}
              aria-label={`${val} de 5`}
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-gray-300)'}`,
                background: selected ? 'var(--color-primary)' : 'var(--color-white)',
                color: selected ? 'var(--color-white)' : 'var(--color-gray-600)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-semibold)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                outline: 'none',
                boxShadow: selected ? 'var(--shadow-md)' : 'none',
              }}
            >
              <RadioGroup.Indicator style={{ display: 'none' }} />
              {val}
            </RadioGroup.Item>
          );
        })}

        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-gray-600)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            maxWidth: '7rem',
            lineHeight: 1.2,
          }}
        >
          Totalmente de acuerdo
        </span>
      </RadioGroup.Root>
    </div>
  );
}

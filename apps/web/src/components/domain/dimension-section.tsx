import { type Control, Controller } from 'react-hook-form';
import { LikertScale } from '../ui/likert-scale';
import { QUESTIONS, type DimensionMeta } from '../../pages/questionnaire/questions-data';
import { QUESTION_KEYS } from '@innlab/contracts';
import type { Dimension, PartialQuestionnaireAnswers } from '@innlab/contracts';

interface DimensionSectionProps {
  dimension: Dimension;
  meta: DimensionMeta;
  control: Control<PartialQuestionnaireAnswers>;
  isIncomplete: boolean;
}

export function DimensionSection({ dimension, meta, control, isIncomplete }: DimensionSectionProps) {
  const questions = QUESTIONS[dimension];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: isIncomplete ? 'var(--color-critical-bg)' : 'var(--color-success-bg)',
          border: `1px solid ${isIncomplete ? 'var(--color-critical)' : 'var(--color-success)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: 'var(--text-sm)',
          color: isIncomplete ? 'var(--color-critical)' : 'var(--color-success)',
          fontWeight: 'var(--font-medium)',
        }}
      >
        <span aria-hidden="true">{isIncomplete ? '⚠' : '✓'}</span>
        {isIncomplete
          ? 'Hay afirmaciones sin responder en esta sección.'
          : 'Sección completada correctamente.'}
      </div>

      {QUESTION_KEYS.map((key, index) => (
        <div
          key={key}
          style={{
            padding: '1.25rem',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-gray-200)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--color-gray-900)',
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                fontWeight: 'var(--font-bold)',
                color: meta.color,
                marginRight: '0.5rem',
              }}
            >
              {index + 1}.
            </span>
            {questions[key]}
          </p>

          <Controller
            control={control}
            name={`${dimension}.${key}`}
            render={({ field }) => (
              <LikertScale
                name={`${dimension}.${key}`}
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      ))}
    </div>
  );
}

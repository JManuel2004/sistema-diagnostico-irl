import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  partialQuestionnaireSchema,
  questionnaireSchema,
  DIMENSIONS,
  QUESTION_KEYS,
  TOTAL_QUESTIONS,
} from '@innlab/contracts';
import type {
  Dimension,
  PartialQuestionnaireAnswers,
  ValidateQuestionnaireResponse,
} from '@innlab/contracts';
import { http } from '../../shared/api/http';
import { DimensionSection } from '../../components/domain/dimension-section';
import { DIMENSION_META } from './questions-data';

function countAnsweredInDimension(
  dimAnswers: PartialQuestionnaireAnswers[Dimension] | undefined,
): number {
  if (!dimAnswers) return 0;
  return QUESTION_KEYS.filter((k) => dimAnswers[k] != null).length;
}

function getIncompleteDimensions(values: PartialQuestionnaireAnswers): Dimension[] {
  return DIMENSIONS.filter(
    (dim) => countAnsweredInDimension(values[dim]) < QUESTION_KEYS.length,
  );
}

function countTotalAnswered(values: PartialQuestionnaireAnswers): number {
  return DIMENSIONS.reduce((acc, dim) => acc + countAnsweredInDimension(values[dim]), 0);
}

export function QuestionnairePage() {
  const [activeTab, setActiveTab] = useState<string>(DIMENSIONS[0]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverResult, setServerResult] = useState<ValidateQuestionnaireResponse | null>(null);

  const { control, handleSubmit } = useForm<PartialQuestionnaireAnswers>({
    resolver: zodResolver(partialQuestionnaireSchema),
    defaultValues: Object.fromEntries(DIMENSIONS.map((d) => [d, {}])) as PartialQuestionnaireAnswers,
  });

  const values = useWatch({ control }) as PartialQuestionnaireAnswers;
  const answeredCount = countTotalAnswered(values);
  const incompleteDimensions = getIncompleteDimensions(values);
  const isComplete = incompleteDimensions.length === 0;
  const progressPercent = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const mutation = useMutation({
    mutationFn: (answers: PartialQuestionnaireAnswers) =>
      http
        .post<ValidateQuestionnaireResponse>('/questionnaire/validate', answers)
        .then((r) => r.data),
    onSuccess: (data) => setServerResult(data),
  });

  const onSubmit = (formValues: PartialQuestionnaireAnswers) => {
    setSubmitAttempted(true);

    const parsed = questionnaireSchema.safeParse(formValues);
    if (!parsed.success) {
      const firstIncomplete = getIncompleteDimensions(formValues)[0];
      if (firstIncomplete) setActiveTab(firstIncomplete);
      return;
    }

    mutation.mutate(formValues);
  };

  if (serverResult?.isComplete) {
    return (
      <div
        style={{
          maxWidth: 'var(--container-max)',
          margin: '0 auto',
          padding: '4rem var(--container-padding)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            padding: '2rem',
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-xl)',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '3rem' }} aria-hidden="true">✓</span>
          <h2 style={{ color: 'var(--color-success)', fontSize: 'var(--text-2xl)' }}>
            Cuestionario enviado exitosamente
          </h2>
          <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-base)' }}>
            Se registraron {serverResult.answeredCount} de {serverResult.totalCount} respuestas.
            El cálculo del perfil IRL comenzará a continuación.
          </p>
        </div>
        <p
          style={{
            marginTop: '2rem',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-gray-400)',
          }}
        >
          KTH Innovation Readiness Level™ (CC BY-NC-SA 4.0)
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        padding: '2rem var(--container-padding)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Encabezado */}
      <div>
        <h1 style={{ fontSize: 'var(--text-3xl)', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
          Diagnóstico IRL
        </h1>
        <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-base)' }}>
          Responde las 48 afirmaciones a continuación para obtener tu perfil de madurez.
          Usa la escala del 1 (totalmente en desacuerdo) al 5 (totalmente de acuerdo).
        </p>
      </div>

      {/* Barra de progreso */}
      <div
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={TOTAL_QUESTIONS}
        aria-label="Progreso del cuestionario"
        style={{
          padding: '1rem 1.25rem',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            color: isComplete ? 'var(--color-success)' : 'var(--color-gray-600)',
          }}
        >
          <span>Progreso</span>
          <span>
            {answeredCount} / {TOTAL_QUESTIONS} afirmaciones respondidas
          </span>
        </div>
        <div
          style={{
            height: '8px',
            background: 'var(--color-gray-200)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: isComplete ? 'var(--color-success)' : 'var(--color-primary)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Tabs de dimensiones */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List
            style={{
              display: 'flex',
              gap: '0.25rem',
              borderBottom: '2px solid var(--color-gray-200)',
              marginBottom: '1.5rem',
              overflowX: 'auto',
            }}
          >
            {DIMENSIONS.map((dim) => {
              const meta = DIMENSION_META[dim];
              const dimIncomplete = incompleteDimensions.includes(dim);
              const dimAnswered = countAnsweredInDimension(values[dim]);
              const isActive = activeTab === dim;

              return (
                <Tabs.Trigger
                  key={dim}
                  value={dim}
                  style={{
                    padding: '0.625rem 1rem',
                    border: 'none',
                    borderBottom: isActive
                      ? `3px solid ${meta.color}`
                      : '3px solid transparent',
                    background: 'transparent',
                    color: isActive ? meta.color : 'var(--color-gray-600)',
                    fontWeight: isActive ? 'var(--font-semibold)' : 'var(--font-normal)',
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    transition: 'color 0.15s',
                    outline: 'none',
                    flexShrink: 0,
                  }}
                >
                  {/* Indicador de estado */}
                  {(submitAttempted || dimAnswered > 0) && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: dimIncomplete ? 'var(--color-critical)' : 'var(--color-success)',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                  )}
                  {meta.label}
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: dimIncomplete
                        ? 'var(--color-critical)'
                        : 'var(--color-success)',
                      opacity: dimAnswered > 0 || submitAttempted ? 1 : 0,
                    }}
                  >
                    ({dimAnswered}/{QUESTION_KEYS.length})
                  </span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          {DIMENSIONS.map((dim) => (
            <Tabs.Content key={dim} value={dim} style={{ outline: 'none' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: 'var(--text-2xl)', color: DIMENSION_META[dim].color }}>
                  {DIMENSION_META[dim].label} —{' '}
                  <span style={{ fontWeight: 'var(--font-normal)', color: 'var(--color-gray-600)' }}>
                    {DIMENSION_META[dim].description}
                  </span>
                </h2>
              </div>
              <DimensionSection
                dimension={dim}
                meta={DIMENSION_META[dim]}
                control={control}
                isIncomplete={submitAttempted && incompleteDimensions.includes(dim)}
              />
            </Tabs.Content>
          ))}
        </Tabs.Root>

        {/* Error global si se intentó enviar con incompletos */}
        {submitAttempted && !isComplete && (
          <div
            role="alert"
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              background: 'var(--color-critical-bg)',
              border: '1px solid var(--color-critical)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-critical)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <span aria-hidden="true" style={{ flexShrink: 0 }}>⚠</span>
            <span>
              Hay {TOTAL_QUESTIONS - answeredCount} afirmación(es) sin responder en las
              secciones:{' '}
              {incompleteDimensions.map((d) => DIMENSION_META[d].label).join(', ')}.
              Por favor completa todas las afirmaciones antes de continuar.
            </span>
          </div>
        )}

        {mutation.isError && (
          <div
            role="alert"
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              background: 'var(--color-critical-bg)',
              border: '1px solid var(--color-critical)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-critical)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Error al comunicarse con el servidor. Intenta de nuevo.
          </div>
        )}

        {/* Pie: botón de envío */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--color-gray-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', margin: 0 }}>
            KTH Innovation Readiness Level™ (CC BY-NC-SA 4.0)
          </p>

          <button
            type="submit"
            disabled={mutation.isPending}
            style={{
              padding: '0.75rem 2rem',
              background: isComplete ? 'var(--color-primary)' : 'var(--color-gray-400)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-semibold)',
              cursor: isComplete && !mutation.isPending ? 'pointer' : 'not-allowed',
              opacity: mutation.isPending ? 0.7 : 1,
              transition: 'background 0.2s',
              boxShadow: isComplete ? 'var(--shadow-md)' : 'none',
            }}
            title={
              !isComplete
                ? `Faltan ${TOTAL_QUESTIONS - answeredCount} respuestas por completar`
                : undefined
            }
          >
            {mutation.isPending ? 'Enviando...' : 'Verificar y continuar'}
          </button>
        </div>
      </form>
    </div>
  );
}

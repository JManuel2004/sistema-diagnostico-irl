import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { QuestionnaireProgress } from '../QuestionnaireProgress';
import { useQuestionnaireDraftStore } from '../../store/questionnaire-draft.store';

const dimensions = [
  {
    code: 'TRL',
    name: 'TRL — Nombre',
    description: 'd',
    sequence: 1,
    statements: Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1),
      dimensionCode: 'TRL' as const,
      sequence: i + 1,
      text: `Afirmación ${i + 1}`,
    })),
  },
] satisfies QuestionnaireStructure['dimensions'];

describe('QuestionnaireProgress', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
  });

  it('cuenta las afirmaciones respondidas y el porcentaje', () => {
    render(<QuestionnaireProgress dimensions={dimensions} />);
    act(() => {
      useQuestionnaireDraftStore.getState().setAnswer('1', 3);
      useQuestionnaireDraftStore.getState().setJustification('1', 'Porque sí.');
      useQuestionnaireDraftStore.getState().setAnswer('2', 4);
      useQuestionnaireDraftStore.getState().setJustification('2', 'Porque sí.');
    });

    expect(
      screen.getByRole('progressbar', { name: '2 de 8 afirmaciones completas' }),
    ).toBeInTheDocument();
    expect(screen.getByText('25% completado')).toBeInTheDocument();
  });

  // Fase 8c: an answer without its justification is not complete.
  it('no cuenta una respuesta sin justificación', () => {
    render(<QuestionnaireProgress dimensions={dimensions} />);
    act(() => {
      useQuestionnaireDraftStore.getState().setAnswer('1', 3);
    });

    expect(
      screen.getByRole('progressbar', { name: '0 de 8 afirmaciones completas' }),
    ).toBeInTheDocument();
  });

  // Backlog 10.2: the draft lives in `sessionStorage` and reaches the server
  // only when the diagnostic is processed, so the chip says exactly that
  // instead of promising an automatic save.
  it('dice dónde vive el borrador, sin prometer guardado entre sesiones', () => {
    render(<QuestionnaireProgress dimensions={dimensions} />);

    expect(screen.getByText('Borrador guardado en esta pestaña')).toBeInTheDocument();
    expect(screen.queryByText('Guardado automático')).not.toBeInTheDocument();
    expect(screen.getByTitle(/mientras no cierres esta pestaña/)).toBeInTheDocument();
  });
});

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

  // The justification is optional: the answer alone completes a statement.
  it('cuenta una respuesta aunque no tenga justificación', () => {
    render(<QuestionnaireProgress dimensions={dimensions} />);
    act(() => {
      useQuestionnaireDraftStore.getState().setAnswer('1', 3);
    });

    expect(
      screen.getByRole('progressbar', { name: '1 de 8 afirmaciones completas' }),
    ).toBeInTheDocument();
  });

  // The draft is saved on the server while the user answers; the band no
  // longer says it lives only in this tab (`DraftSaveStatus` tells the save).
  it('no dice que el borrador viva solo en esta pestaña', () => {
    render(<QuestionnaireProgress dimensions={dimensions} />);

    expect(screen.queryByText(/esta pestaña/)).not.toBeInTheDocument();
  });
});

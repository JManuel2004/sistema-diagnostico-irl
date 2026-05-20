import { beforeEach, describe, expect, it } from 'vitest';
import { useQuestionnaireDraftStore } from '../../store/questionnaire-draft.store';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Statement } from '@innlab/contracts';
import { StatementCard } from '../StatementCard';

const statement: Statement = {
  id: '1',
  dimensionCode: 'TRL',
  sequence: 3,
  text: 'Hemos validado experimentalmente componentes individuales.',
};

describe('StatementCard', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
  });

  it('renders the statement text', () => {
    render(<StatementCard statement={statement} />);
    expect(
      screen.getByText('Hemos validado experimentalmente componentes individuales.'),
    ).toBeInTheDocument();
  });

  it('renders the position label and binds the Likert group to the statement text', () => {
    render(<StatementCard statement={statement} />);
    expect(screen.getByText('Afirmación 3 de 8')).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', {
        name: 'Hemos validado experimentalmente componentes individuales.',
      }),
    ).toBeInTheDocument();
  });

  it('stores the selected answer and keeps the selection when clicked again', async () => {
    const user = userEvent.setup();

    useQuestionnaireDraftStore.getState().setAnswer(statement.id, 3);

    render(<StatementCard statement={statement} />);

    await user.click(screen.getByRole('radio', { name: '4 — De acuerdo' }));

    expect(useQuestionnaireDraftStore.getState().answers[statement.id]).toBe(4);
    expect(screen.getByRole('radio', { name: '4 — De acuerdo' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: '4 — De acuerdo' }));

    expect(useQuestionnaireDraftStore.getState().answers[statement.id]).toBe(4);
    expect(screen.getByRole('radio', { name: '4 — De acuerdo' })).toBeChecked();
  });
});

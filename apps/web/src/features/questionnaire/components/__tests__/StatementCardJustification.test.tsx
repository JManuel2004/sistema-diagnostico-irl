import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Statement } from '@innlab/contracts';
import { StatementCard } from '../StatementCard';
import {
  isStatementComplete,
  useQuestionnaireDraftStore,
} from '../../store/questionnaire-draft.store';

const statement: Statement = {
  id: '7',
  dimensionCode: 'CRL',
  sequence: 2,
  text: 'Hemos hablado con clientes potenciales.',
};

function store() {
  return useQuestionnaireDraftStore.getState();
}

describe('StatementCard — justification', () => {
  beforeEach(() => {
    store().clear();
    sessionStorage.clear();
  });

  it('asks why the user chose the level, next to the Likert scale', () => {
    render(<StatementCard statement={statement} />);

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByLabelText('¿Por qué elegiste este nivel?')).toBeInTheDocument();
  });

  it('says the justification is mandatory and shows the length limit', () => {
    render(<StatementCard statement={statement} />);

    expect(screen.getByText(/0 \/ 1000 caracteres · Obligatoria/)).toBeInTheDocument();
  });

  it('stores what the user writes, per statement, and counts the characters', async () => {
    const user = userEvent.setup();
    render(<StatementCard statement={statement} />);

    await user.type(
      screen.getByLabelText('¿Por qué elegiste este nivel?'),
      'Hablamos con 14 personas',
    );

    expect(store().justifications['7']).toBe('Hablamos con 14 personas');
    expect(screen.getByText(/24 \/ 1000 caracteres/)).toBeInTheDocument();
  });

  it('shows a justification that was already in the draft', () => {
    store().setJustification('7', 'Ya lo había escrito');

    render(<StatementCard statement={statement} />);

    expect(screen.getByLabelText('¿Por qué elegiste este nivel?')).toHaveValue(
      'Ya lo había escrito',
    );
  });

  it('does not accept more than 1000 characters', () => {
    render(<StatementCard statement={statement} />);

    expect(screen.getByLabelText('¿Por qué elegiste este nivel?')).toHaveAttribute(
      'maxlength',
      '1000',
    );
  });

  it('does not touch the answer when only the justification changes', async () => {
    const user = userEvent.setup();
    store().setAnswer('7', 4);
    render(<StatementCard statement={statement} />);

    await user.type(screen.getByLabelText('¿Por qué elegiste este nivel?'), 'x');

    expect(store().answers['7']).toBe(4);
  });
});

describe('isStatementComplete', () => {
  it('needs both the answer and a non-blank justification', () => {
    expect(isStatementComplete({ '1': 3 }, { '1': 'Porque sí' }, '1')).toBe(true);
    expect(isStatementComplete({ '1': 3 }, {}, '1')).toBe(false);
    expect(isStatementComplete({ '1': 3 }, { '1': '   ' }, '1')).toBe(false);
    expect(isStatementComplete({}, { '1': 'Porque sí' }, '1')).toBe(false);
  });
});

describe('draft store — justifications', () => {
  beforeEach(() => {
    store().clear();
  });

  it('wipes the justifications together with the answers when the diagnostic changes', () => {
    store().initialize('diag-a');
    store().setAnswer('1', 3);
    store().setJustification('1', 'Porque sí');

    store().initialize('diag-b');

    expect(store().answers).toEqual({});
    expect(store().justifications).toEqual({});
  });

  it('fills answers and justifications at once', () => {
    store().fill({ '1': 4, '2': 2 }, { '1': 'a', '2': 'b' });

    expect(store().answers).toEqual({ '1': 4, '2': 2 });
    expect(store().justifications).toEqual({ '1': 'a', '2': 'b' });
  });
});

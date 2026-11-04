import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DraftSaveStatus } from '../DraftSaveStatus';

describe('DraftSaveStatus — si las respuestas están guardadas', () => {
  it('antes de guardar, dice que se guardan solas', () => {
    render(<DraftSaveStatus status={{ kind: 'idle' }} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Tus respuestas se guardan automáticamente.',
    );
  });

  it('mientras guarda, lo dice', () => {
    render(<DraftSaveStatus status={{ kind: 'saving' }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Guardando tus respuestas…');
  });

  it('guardadas, dice a qué hora y que puede volver después', () => {
    render(<DraftSaveStatus status={{ kind: 'saved', at: '2026-10-16T17:05:00.000Z' }} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      /^Tus respuestas se guardaron a las .+ y puedes cerrar sesión/,
    );
    expect(status).not.toHaveTextContent(';');
    expect(status.textContent?.match(/después\./g)).toHaveLength(1);
    expect(status).not.toHaveTextContent('..');
  });

  it('si falló, dice que lo reintentará y que no se perdieron', () => {
    render(<DraftSaveStatus status={{ kind: 'error' }} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'No pudimos guardar tus respuestas; lo intentaremos de nuevo. Siguen en esta pestaña.',
    );
  });
});

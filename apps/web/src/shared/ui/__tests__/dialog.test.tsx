import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog';

describe('Dialog (shared/ui)', () => {
  function renderSample(): void {
    render(
      <Dialog>
        <DialogTrigger>Abrir diálogo</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cuestionario incompleto</DialogTitle>
            <DialogDescription>Aún faltan respuestas por marcar.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
  }

  it('no muestra el contenido hasta que se abre', () => {
    renderSample();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre el diálogo al activar el trigger y expone roles ARIA', async () => {
    renderSample();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir diálogo' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cuestionario incompleto' })).toBeInTheDocument();
  });

  it('provee un botón "Cerrar" accesible', async () => {
    renderSample();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir diálogo' }));
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });
});

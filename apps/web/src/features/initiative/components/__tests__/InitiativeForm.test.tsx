import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SECTORS, STAGES } from '@/test/fixtures/initiative';
import { EMPTY_INITIATIVE_FORM } from '../../lib/form-values';
import { InitiativeForm } from '../InitiativeForm';

const SECTOR = '¿A qué sector económico pertenece tu iniciativa?';
const OWN_SECTOR = '¿A qué sector pertenece tu iniciativa?';

function renderForm(onSubmit = vi.fn()) {
  render(
    <InitiativeForm
      sectors={SECTORS}
      stages={STAGES}
      initial={{
        ...EMPTY_INITIATIVE_FORM,
        name: 'Satélites Andinos',
        stageId: '2',
        productType: 'Nanosatélites',
        declaredStage: 'Prototipo',
        teamSize: '4',
        teamDescription: 'Ingenieros',
        targetMarket: 'Universidades',
        currentFunding: 'Convocatoria',
      }}
      onSubmit={onSubmit}
      isSubmitting={false}
    />,
  );
  return onSubmit;
}

async function pick(user: ReturnType<typeof userEvent.setup>, name: RegExp): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: SECTOR }));
  await user.click(screen.getByRole('option', { name }));
}

describe('InitiativeForm — el sector', () => {
  it('con «Otro sector» pide describirlo y no deja continuar sin hacerlo', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    expect(screen.queryByLabelText(OWN_SECTOR)).not.toBeInTheDocument();
    await pick(user, /^Otro sector \(especificar\)/);
    const own = screen.getByLabelText(OWN_SECTOR);
    expect(own).toHaveAttribute('placeholder', 'Describe brevemente el sector económico…');

    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(
      await screen.findByText('Cuéntanos a qué sector pertenece tu iniciativa'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(own, 'Industria aeroespacial');
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ sectorId: '23', customSector: 'Industria aeroespacial' }),
      expect.anything(),
    );
  });

  it('al pasar de «Otro sector» a una sección oculta el campo y no envía lo escrito', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    await pick(user, /^Otro sector \(especificar\)/);
    await user.type(screen.getByLabelText(OWN_SECTOR), 'Economía circular');
    await pick(user, /^Telecomunicaciones/);

    expect(screen.queryByLabelText(OWN_SECTOR)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ sectorId: '11', customSector: null }),
      expect.anything(),
    );
  });

  it('explica cómo elegir el sector cuando la iniciativa usa tecnología', () => {
    renderForm();

    expect(
      screen.getByText('¿Tu iniciativa usa tecnología? Así eliges el sector'),
    ).toBeInTheDocument();
  });
});

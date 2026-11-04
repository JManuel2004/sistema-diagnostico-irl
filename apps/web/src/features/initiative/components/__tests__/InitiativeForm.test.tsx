import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SECTORS, STAGES } from '@/test/fixtures/initiative';
import { EMPTY_INITIATIVE_FORM } from '../../lib/form-values';
import { InitiativeForm } from '../InitiativeForm';

const notifyError = vi.hoisted(() => vi.fn());
vi.mock('@/shared/ui/notify', () => ({ notify: { error: notifyError, success: vi.fn() } }));

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
    expect(own.getAttribute('placeholder')).toMatch(
      /^Describe brevemente el sector económico\. Por ejemplo:/,
    );

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

  it('explica en una ventana cómo elegir el sector cuando la iniciativa usa tecnología', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole('button', { name: '¿Tu iniciativa usa tecnología? Así eliges el sector' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Cómo elegir el sector si tu iniciativa usa tecnología' }),
    ).toBeInTheDocument();
  });
});

describe('InitiativeForm — ayudas y validación', () => {
  it('debajo de cada texto dice cuántos caracteres lleva de su máximo', async () => {
    const user = userEvent.setup();
    renderForm();

    const name = screen.getByLabelText('Nombre de la iniciativa');
    expect(name).toHaveAccessibleDescription('17 de 120 caracteres');
    await user.type(name, 'X');
    expect(name).toHaveAccessibleDescription('18 de 120 caracteres');
    expect(
      screen.getByLabelText('¿Cuál es el mercado objetivo de tu iniciativa?'),
    ).toHaveAccessibleDescription('13 de 500 caracteres');
  });

  it('pone qué escribir y un ejemplo dentro del campo', () => {
    render(
      <InitiativeForm sectors={SECTORS} stages={STAGES} onSubmit={vi.fn()} isSubmitting={false} />,
    );

    expect(
      screen.getByLabelText('¿Cómo se financia hoy tu iniciativa?').getAttribute('placeholder'),
    ).toMatch(/^Si todavía no tiene financiación, cuéntalo también\. Por ejemplo:/);
  });

  it('cada etapa de la lista dice qué significa, debajo de su nombre', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('combobox', { name: '¿En qué etapa está tu iniciativa?' }));

    expect(screen.getByRole('option', { name: 'Idea' })).toHaveAccessibleDescription(
      /Todavía es un concepto/,
    );
    expect(screen.getByRole('option', { name: 'Validación' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('un equipo con decimales se explica en español', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await pick(user, /^Agricultura/);
    const team = screen.getByLabelText('¿Cuántas personas conforman el equipo?');
    await user.clear(team);
    await user.type(team, '0.1');

    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

    expect(
      await screen.findByText('Escribe un número entero de personas, sin decimales'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('enviar con errores lo avisa en una notificación', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

    expect(notifyError).toHaveBeenCalledWith('No pudimos continuar: revisa los campos marcados.');
  });
});

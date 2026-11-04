import { useState, type JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SECTOR_CATALOG } from '@/test/fixtures/sectors-catalog';
import { SectorCombobox } from '../SectorCombobox';

function Harness({ initial = '' }: { readonly initial?: string }): JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="sector">Sector</label>
      <SectorCombobox id="sector" sectors={SECTOR_CATALOG} value={value} onChange={setValue} />
      <output>{value}</output>
    </>
  );
}

const combobox = () => screen.getByRole('combobox', { name: 'Sector' });
const options = () => within(screen.getByRole('listbox')).getAllByRole('option');

describe('SectorCombobox', () => {
  it('al abrir ofrece las 22 secciones con su código y «Otro sector» al final', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(combobox());

    expect(combobox()).toHaveAttribute('aria-expanded', 'true');
    expect(options()).toHaveLength(23);
    expect(options()[0]).toHaveTextContent('AAgricultura, ganadería, caza, silvicultura y pesca');
    expect(options()[22]).toHaveTextContent('Otro sector (especificar)');
  });

  it('filtra mientras se escribe y deja «Otro sector» siempre disponible', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(combobox(), 'software');

    expect(options().map((o) => o.textContent)).toEqual([
      expect.stringContaining('Telecomunicaciones, programación informática'),
      expect.stringContaining('Actividades editoriales'),
      expect.stringContaining('Otro sector (especificar)'),
    ]);
  });

  it('bajo cada sección dice lo que agrupa, como descripción de la opción', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(combobox(), 'peluquería');

    const services = screen.getByRole('option', { name: 'Otras actividades de servicios' });
    expect(services).toHaveAccessibleDescription(
      'Asociaciones y sindicatos, reparación de computadores, efectos personales y vehículos, y servicios personales como peluquería o lavandería.',
    );
    expect(
      screen.getByRole('option', { name: 'Otro sector (especificar)' }),
    ).toHaveAccessibleDescription(
      'Si ninguna sección representa tu actividad, descríbela con tus palabras.',
    );
  });

  it('avisa cuando no encuentra nada', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(combobox(), 'aeroespacial');

    expect(screen.getByText(/No encontramos un sector con «aeroespacial»/)).toBeInTheDocument();
    expect(options()).toHaveLength(1);
  });

  it('se recorre con las flechas y se elige con Enter, sin enviar el formulario', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(combobox(), 'salud');
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent('18');
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(combobox()).toHaveValue(
      'Actividades de atención de la salud humana y de asistencia social',
    );
  });

  it('señala la opción activa al lector de pantalla', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(combobox());
    await user.keyboard('{ArrowDown}');

    const active = combobox().getAttribute('aria-activedescendant');
    expect(active).toBe(options()[1].id);
  });

  it('cerrado, muestra el sector elegido una sola vez', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(combobox());
    await user.click(screen.getByRole('option', { name: /^Educación/ }));

    expect(combobox()).toHaveValue('Educación');
    expect(screen.queryByText('Sección Q ·')).not.toBeInTheDocument();
  });

  it('Escape cierra la lista y conserva lo elegido', async () => {
    const user = userEvent.setup();
    render(<Harness initial="6" />);

    await user.click(combobox());
    await user.type(combobox(), 'agua');
    await user.keyboard('{Escape}');

    expect(combobox()).toHaveValue('Construcción');
    expect(screen.getByRole('status')).toHaveTextContent('6');
  });
});

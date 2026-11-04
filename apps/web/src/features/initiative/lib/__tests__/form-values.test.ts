import { describe, expect, it } from 'vitest';
import { initiativeFixture } from '@/test/fixtures/initiative';
import {
  commandToFormValues,
  initiativeFormSchemaFor,
  initiativeToFormValues,
  type InitiativeFormValues,
} from '../form-values';

describe('valores del formulario de la iniciativa', () => {
  it('una iniciativa registrada se vuelve texto de formulario, con los ids de sector y etapa', () => {
    expect(initiativeToFormValues(initiativeFixture())).toEqual({
      name: 'AgroConecta',
      sectorId: '1',
      customSector: '',
      productType: 'Aplicación web y módulo de trazabilidad',
      stageId: '2',
      declaredStage: 'Piloto completado',
      teamSize: '3',
      teamDescription: 'Fundadora, coordinadora y desarrollador externo',
      targetMarket: 'Productores de café del suroccidente',
      currentFunding: 'Ahorros de la fundadora',
    });
  });

  it('una iniciativa de «Otro sector» vuelve con su sector descrito', () => {
    const values = initiativeToFormValues(
      initiativeFixture({ customSector: 'Industria aeroespacial' }),
    );

    expect(values.customSector).toBe('Industria aeroespacial');
  });

  it('el borrador guardado vuelve al formulario tal como se envió, con el equipo como texto', () => {
    const values = commandToFormValues({
      name: 'AgroConecta',
      sectorId: '1',
      productType: 'App web',
      stageId: '2',
      declaredStage: 'Piloto',
      teamSize: 3,
      teamDescription: 'Equipo',
      targetMarket: 'Café',
      currentFunding: 'Ahorros',
    });

    expect(values.teamSize).toBe('3');
    expect(values.sectorId).toBe('1');
    expect(values.customSector).toBe('');
  });
});

describe('validación del sector con «Otro sector» (id 23)', () => {
  const schema = initiativeFormSchemaFor(new Set(['23']));
  const filled: InitiativeFormValues = {
    name: 'AgroConecta',
    sectorId: '1',
    customSector: '',
    productType: 'App web',
    stageId: '2',
    declaredStage: 'Piloto',
    teamSize: '3',
    teamDescription: 'Equipo',
    targetMarket: 'Café',
    currentFunding: 'Ahorros',
  };

  it('con «Otro sector» exige describir el sector', () => {
    const parsed = schema.safeParse({ ...filled, sectorId: '23', customSector: '   ' });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => i.path.join('.'))).toEqual(['customSector']);
  });

  it('con «Otro sector» envía el sector descrito, sin espacios sobrantes', () => {
    const parsed = schema.parse({ ...filled, sectorId: '23', customSector: ' Nanotecnología ' });

    expect(parsed.customSector).toBe('Nanotecnología');
  });

  it('con una sección de la CIIU descarta lo escrito antes para «Otro»', () => {
    const parsed = schema.parse({ ...filled, customSector: 'Economía circular' });

    expect(parsed.customSector).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { initiativeFixture } from '@/test/fixtures/initiative';
import { commandToFormValues, initiativeToFormValues } from '../form-values';

describe('valores del formulario de la iniciativa', () => {
  it('una iniciativa registrada se vuelve texto de formulario, con los ids de sector y etapa', () => {
    expect(initiativeToFormValues(initiativeFixture())).toEqual({
      name: 'AgroConecta',
      sectorId: '1',
      productType: 'Aplicación web y módulo de trazabilidad',
      stageId: '2',
      declaredStage: 'Piloto completado',
      teamSize: '3',
      teamDescription: 'Fundadora, coordinadora y desarrollador externo',
      academicLinkage: 'false',
      targetMarket: 'Productores de café del suroccidente',
      currentFunding: 'Ahorros de la fundadora',
    });
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
      academicLinkage: false,
      targetMarket: 'Café',
      currentFunding: 'Ahorros',
    });

    expect(values.teamSize).toBe('3');
    expect(values.sectorId).toBe('1');
  });
});

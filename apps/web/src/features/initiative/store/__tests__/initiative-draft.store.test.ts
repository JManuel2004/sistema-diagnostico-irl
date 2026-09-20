import { beforeEach, describe, expect, it } from 'vitest';
import type { RegisterInitiativeCommand } from '@innlab/contracts';
import { useInitiativeDraftStore } from '../initiative-draft.store';

const COMMAND: RegisterInitiativeCommand = {
  name: 'AgroConecta',
  sectorId: '1',
  productType: 'App web',
  stageId: '2',
  declaredStage: 'Piloto completado',
  teamSize: 3,
  teamDescription: 'Fundadora y equipo',
  targetMarket: 'Productores de café',
  currentFunding: 'Ahorros',
};

describe('initiative draft store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useInitiativeDraftStore.setState({ diagnosticId: null, command: null });
  });

  it('guarda el formulario del paso 1 mientras el consentimiento no está aceptado', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(COMMAND);

    expect(useInitiativeDraftStore.getState().command).toEqual(COMMAND);
  });

  it('cambiar de diagnóstico descarta el borrador del anterior', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(COMMAND);

    useInitiativeDraftStore.getState().initialize('d2');

    expect(useInitiativeDraftStore.getState().diagnosticId).toBe('d2');
    expect(useInitiativeDraftStore.getState().command).toBeNull();
  });

  it('inicializar con el mismo diagnóstico conserva el borrador', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(COMMAND);

    useInitiativeDraftStore.getState().initialize('d1');

    expect(useInitiativeDraftStore.getState().command).toEqual(COMMAND);
  });

  it('se vacía al registrar la iniciativa, sin perder de qué diagnóstico es', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(COMMAND);

    useInitiativeDraftStore.getState().clear();

    expect(useInitiativeDraftStore.getState().command).toBeNull();
    expect(useInitiativeDraftStore.getState().diagnosticId).toBe('d1');
  });

  it('vive en sessionStorage, no en localStorage: muere con la pestaña', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(COMMAND);

    expect(sessionStorage.getItem('innlab.initiative-draft.v1')).toContain('AgroConecta');
    expect(localStorage.getItem('innlab.initiative-draft.v1')).toBeNull();
  });
});

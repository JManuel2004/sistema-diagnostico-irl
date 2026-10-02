import { beforeEach, describe, expect, it } from 'vitest';
import { useInitiativeDraftStore, type InitiativeDraft } from '../initiative-draft.store';

const COMMAND: InitiativeDraft['command'] = {
  name: 'AgroConecta',
  sectorId: '1',
  productType: 'App web',
  stageId: '2',
  declaredStage: 'Piloto completado',
  teamSize: 3,
  teamDescription: 'Fundadora y equipo',
  academicLinkage: false,
  targetMarket: 'Productores de café',
  currentFunding: 'Ahorros',
};

const DRAFT: InitiativeDraft = { initiativeId: null, command: COMMAND };

describe('initiative draft store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useInitiativeDraftStore.setState({
      diagnosticId: null,
      draft: null,
      acceptedTermsVersion: null,
    });
  });

  it('guarda el formulario de la iniciativa antes de registrarla', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(DRAFT);

    expect(useInitiativeDraftStore.getState().draft).toEqual(DRAFT);
  });

  it('conserva la iniciativa elegida, o la que el paso 2 creó, junto al formulario', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save({ initiativeId: 'i1', command: COMMAND });

    expect(useInitiativeDraftStore.getState().draft?.initiativeId).toBe('i1');
  });

  it('cambiar de diagnóstico descarta el borrador del anterior', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(DRAFT);

    useInitiativeDraftStore.getState().initialize('d2');

    expect(useInitiativeDraftStore.getState().diagnosticId).toBe('d2');
    expect(useInitiativeDraftStore.getState().draft).toBeNull();
  });

  it('inicializar con el mismo diagnóstico conserva el borrador', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(DRAFT);

    useInitiativeDraftStore.getState().initialize('d1');

    expect(useInitiativeDraftStore.getState().draft).toEqual(DRAFT);
  });

  it('se vacía al registrar la iniciativa, sin perder de qué diagnóstico es', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(DRAFT);

    useInitiativeDraftStore.getState().clear();

    expect(useInitiativeDraftStore.getState().draft).toBeNull();
    expect(useInitiativeDraftStore.getState().acceptedTermsVersion).toBeNull();
    expect(useInitiativeDraftStore.getState().diagnosticId).toBe('d1');
  });

  it('recuerda la versión del texto aceptada antes de elegir la iniciativa', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().acceptTerms('v1');

    expect(useInitiativeDraftStore.getState().acceptedTermsVersion).toBe('v1');

    useInitiativeDraftStore.getState().initialize('d2');

    expect(useInitiativeDraftStore.getState().acceptedTermsVersion).toBeNull();
  });

  it('vive en sessionStorage, no en localStorage: muere con la pestaña', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(DRAFT);

    expect(sessionStorage.getItem('innlab.initiative-draft.v2')).toContain('AgroConecta');
    expect(localStorage.getItem('innlab.initiative-draft.v2')).toBeNull();
  });
});

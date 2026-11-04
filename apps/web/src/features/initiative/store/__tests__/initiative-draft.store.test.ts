import { beforeEach, describe, expect, it } from 'vitest';
import { useInitiativeDraftStore, type InitiativeDraft } from '../initiative-draft.store';

const VALUES: InitiativeDraft['values'] = {
  name: 'AgroConecta',
  sectorId: '1',
  customSector: '',
  productType: 'App web',
  stageId: '2',
  declaredStage: 'Piloto completado',
  teamSize: '3',
  teamDescription: 'Fundadora y equipo',
  targetMarket: 'Productores de café',
  currentFunding: 'Ahorros',
};

const DRAFT: InitiativeDraft = { initiativeId: null, values: VALUES };

describe('initiative draft store', () => {
  beforeEach(() => {
    localStorage.clear();
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
    useInitiativeDraftStore.getState().save({ initiativeId: 'i1', values: VALUES });

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

  it('guarda también un formulario a medio llenar', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore
      .getState()
      .save({ initiativeId: null, values: { ...VALUES, teamSize: '', stageId: '' } });

    expect(useInitiativeDraftStore.getState().draft?.values.name).toBe('AgroConecta');
  });

  it('vive en localStorage: sobrevive a cerrar la pestaña y la sesión', () => {
    useInitiativeDraftStore.getState().initialize('d1');
    useInitiativeDraftStore.getState().save(DRAFT);

    expect(localStorage.getItem('innlab.initiative-draft.v3')).toContain('AgroConecta');
  });
});

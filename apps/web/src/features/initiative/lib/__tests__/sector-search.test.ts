import { describe, expect, it } from 'vitest';
import { SECTOR_CATALOG } from '@/test/fixtures/sectors-catalog';
import { searchSectors } from '../sector-search';

const firstCode = (query: string): string | null | undefined =>
  searchSectors(SECTOR_CATALOG, query).matches.at(0)?.code;

describe('búsqueda de sectores', () => {
  it('sin texto ofrece las 22 secciones en orden, A a V, y «Otro» aparte', () => {
    const result = searchSectors(SECTOR_CATALOG, '  ');

    expect(result.matches.map((s) => s.code).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUV');
    expect(result.other?.name).toBe('Otro sector (especificar)');
  });

  it.each([
    ['Agricultura', 'A'],
    ['Software', 'K'],
    ['Educación', 'Q'],
    ['Salud', 'R'],
    ['Construcción', 'F'],
    ['Comercio', 'G'],
    ['Finanzas', 'L'],
    ['tecnología', 'K'],
  ])('«%s» encuentra primero la sección %s', (query, code) => {
    expect(firstCode(query)).toBe(code);
  });

  it('no distingue mayúsculas ni tildes', () => {
    expect(firstCode('EDUCACION')).toBe('Q');
    expect(firstCode('construccion')).toBe('F');
  });

  it('encuentra por el comienzo de una palabra y por el código de la sección', () => {
    expect(firstCode('tecno')).toBe('K');
    expect(firstCode('k')).toBe('K');
  });

  it('encuentra por lo que agrupa la sección, aunque su título no lo diga', () => {
    expect(firstCode('peluquería')).toBe('T');
    expect(firstCode('sindicatos')).toBe('T');
    expect(firstCode('call center')).toBeUndefined();
    expect(firstCode('centros de llamadas')).toBe('O');
  });

  it('la descripción pesa menos que las palabras relacionadas', () => {
    // J también menciona el software (su edición), pero K lo tiene como palabra relacionada.
    const codes = searchSectors(SECTOR_CATALOG, 'software').matches.map((s) => s.code);

    expect(codes).toEqual(['K', 'J']);
  });

  it('con varias palabras exige que todas coincidan', () => {
    const codes = searchSectors(SECTOR_CATALOG, 'servicios de comidas').matches.map((s) => s.code);

    expect(codes).toEqual(['I']);
  });

  it('sin coincidencias no deja secciones, pero siempre ofrece «Otro»', () => {
    const result = searchSectors(SECTOR_CATALOG, 'aeroespacial');

    expect(result.matches).toEqual([]);
    expect(result.other?.isOther).toBe(true);
  });
});

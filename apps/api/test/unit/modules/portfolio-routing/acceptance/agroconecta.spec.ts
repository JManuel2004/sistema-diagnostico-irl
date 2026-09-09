import { describe, expect, it } from '@jest/globals';
import type { DimensionCode, HechosDiagnostico } from '@innlab/contracts';
import {
  ESCALA_CALIBRACION,
  FICHAS,
  PARAMETROS_SCORING,
  REGLAS_ELEGIBILIDAD,
  REGLAS_EXCEPCION,
  SERVICIOS,
} from '../../../../../src/infrastructure/database/seeds/data/portfolio-routing.js';
import { EscalaCalibracion } from '../../../../../src/modules/portfolio-routing/domain/value-objects/escala-calibracion.vo.js';
import type { FichaOrdinal } from '../../../../../src/modules/portfolio-routing/domain/value-objects/ficha-ordinal.vo.js';
import { OrdinalTranslatorService } from '../../../../../src/modules/portfolio-routing/domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from '../../../../../src/modules/portfolio-routing/domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from '../../../../../src/modules/portfolio-routing/domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from '../../../../../src/modules/portfolio-routing/domain/services/exception-engine.service.js';
import { PredicateCompilerService } from '../../../../../src/modules/portfolio-routing/domain/services/predicate-compiler.service.js';
import type { ReglaElegibilidadCompilada } from '../../../../../src/modules/portfolio-routing/domain/services/eligibility-filter.service.js';
import type { ReglaExcepcionCompilada } from '../../../../../src/modules/portfolio-routing/domain/services/exception-engine.service.js';

/**
 * Prueba de aceptación del motor de enrutamiento — caso AgroConecta.
 *
 * Corre el motor completo contra **la configuración que siembra el seed**,
 * no contra un fixture paralelo: importa `data/portfolio-routing.ts`
 * directamente, de modo que si alguien cambia una ficha o un peso la
 * prueba lo detecta. Un fixture propio habría convertido esto en una
 * prueba de sí misma.
 *
 * Los valores esperados se derivaron a mano de la escala, las fichas y
 * los pesos declarados, no observando lo que produce el código. El
 * desglose término a término está más abajo para que sean verificables
 * sin ejecutar nada.
 *
 * Perfil de AgroConecta: TRL 6 · CRL 4 · BRL 3 · IPRL 1 · TmRL 5 · FRL 2
 *   - cuello de botella: IPRL (nivel 1, sin empate)
 *   - brechas (IRL ≤ 3):  BRL, IPRL, FRL  → tres
 *   - nivel promedio:     21 / 6 = 3.5
 *   - desequilibrios:     TRL-IPRL crítico (5); TRL-CRL, TRL-BRL,
 *                         TmRL-FRL y BRL-IPRL moderados; CRL-BRL aceptable
 */

const ID_POR_SERVICIO = new Map(
  SERVICIOS.map((s, i) => [s.nombre, i + 1] as const),
);

const NIVELES: Record<DimensionCode, number> = {
  TRL: 6,
  CRL: 4,
  BRL: 3,
  IPRL: 1,
  TmRL: 5,
  FRL: 2,
};

const HECHOS_AGROCONECTA: HechosDiagnostico = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  nivelPorDimension: NIVELES,
  cuellosBotella: ['IPRL'],
  brechas: ['BRL', 'IPRL', 'FRL'],
  desequilibrios: [
    { izquierda: 'TRL', derecha: 'CRL', diferencia: 2, clasificacion: 'MODERADO' },
    { izquierda: 'TRL', derecha: 'BRL', diferencia: 3, clasificacion: 'MODERADO' },
    { izquierda: 'CRL', derecha: 'BRL', diferencia: 1, clasificacion: 'ACEPTABLE' },
    { izquierda: 'TmRL', derecha: 'FRL', diferencia: 3, clasificacion: 'MODERADO' },
    { izquierda: 'BRL', derecha: 'IPRL', diferencia: 2, clasificacion: 'MODERADO' },
    { izquierda: 'TRL', derecha: 'IPRL', diferencia: 5, clasificacion: 'CRITICO' },
  ],
  nivelPromedio: 3.5,
  // El documento del caso registra `vinculacion_academica` como "null
  // (asumido falso)". El supuesto se codifica explícitamente como `false`
  // en vez de dejarlo a una coerción de `null`, para que quede visible en
  // el dato: el motor trata `null` como "no excluye", así que confiar en
  // la coerción habría dado el resultado contrario en silencio.
  caracterizacion: {
    etapa: 'validacion',
    sector: 'agroindustria',
    tamanoEquipo: 3,
    vinculacionAcademica: false,
  },
};

function construirEngine() {
  const compiler = new PredicateCompilerService();
  const escala = EscalaCalibracion.create(
    ESCALA_CALIBRACION.map((p) => ({
      etiqueta: p.etiqueta,
      valor: p.valor,
      orden: p.orden,
    })),
  );

  const fichas: FichaOrdinal[] = FICHAS.map((f) => ({
    idServicio: ID_POR_SERVICIO.get(f.servicio)!,
    nombreServicio: f.servicio,
    nivelMin: f.nivelMin,
    nivelMax: f.nivelMax,
    etapasPertinentes: f.etapasPertinentes,
    intensidades: new Map(
      Object.entries(f.intensidades) as [DimensionCode, string][],
    ),
  }));

  const reglasElegibilidad: ReglaElegibilidadCompilada[] =
    REGLAS_ELEGIBILIDAD.map((r) => ({
      idRegla: r.codigo,
      idServicio: ID_POR_SERVICIO.get(r.servicio)!,
      expresion: compiler.compile(r.predicado, 'BOOLEANO'),
      mensajeExclusion: r.mensajeExclusion,
    }));

  const reglasExcepcion: ReglaExcepcionCompilada[] = REGLAS_EXCEPCION.map(
    (r) => ({
      codigo: r.codigo,
      prioridadOrden: r.prioridadOrden,
      expresion: compiler.compile(r.predicado, 'CON_GRADO'),
      accion: r.accion,
      idServicioObjetivo: ID_POR_SERVICIO.get(r.servicioObjetivo)!,
      posiciones: r.posiciones,
      motivoDeclarado: r.motivoDeclarado,
    }),
  );

  return { escala, fichas, reglasElegibilidad, reglasExcepcion };
}

function evaluar(hechos: HechosDiagnostico) {
  const { escala, fichas, reglasElegibilidad, reglasExcepcion } =
    construirEngine();

  const numericas = new OrdinalTranslatorService().translate(fichas, escala);
  const { elegibles, excluidos } = new EligibilityFilterService().filter(
    numericas,
    reglasElegibilidad,
    hechos,
  );
  const puntuados = new AffinityScorerService().score(
    elegibles,
    hechos,
    PARAMETROS_SCORING,
  );
  const rankingPre = [...puntuados].sort((a, b) =>
    b.total !== a.total ? b.total - a.total : a.idServicio - b.idServicio,
  );
  const resultado = new ExceptionEngineService().apply(
    rankingPre,
    reglasExcepcion,
    hechos,
  );

  return { excluidos, rankingPre, ...resultado };
}

describe('Aceptación — enrutamiento de portafolio para AgroConecta', () => {
  describe('capa 1 · elegibilidad', () => {
    it('excluye Proyectos de Grado por falta de vinculación académica (ELG-01)', () => {
      const { excluidos } = evaluar(HECHOS_AGROCONECTA);

      expect(excluidos).toHaveLength(1);
      expect(excluidos[0].nombre).toBe('Proyectos de Grado');
      expect(excluidos[0].mensajeExclusion).toContain(
        'vinculación académica confirmada',
      );
    });

    it('no excluye Retos en el Aula: el equipo tiene 3 personas (ELG-02 exige ≥2)', () => {
      const { excluidos } = evaluar(HECHOS_AGROCONECTA);

      expect(excluidos.map((e) => e.nombre)).not.toContain('Retos en el Aula');
    });
  });

  describe('capa 2 · cálculo de afinidad', () => {
    /**
     * Desglose de Consultoría, derivado a mano de la configuración:
     *
     *   intensidades → TRL 0.0 · CRL 1.0 · BRL 1.0 · IPRL 0.5 · TmRL 0.0 · FRL 0.5
     *
     *   cuello (IPRL)   3.0 × 0.5                              = 1.50
     *   brechas         1.5 × (BRL 1.0 + IPRL 0.5 + FRL 0.5)   = 3.00
     *   desequilibrios  TRL-CRL   0.5 × max(0.0, 1.0) = 0.50
     *                   TRL-BRL   0.5 × max(0.0, 1.0) = 0.50
     *                   CRL-BRL   aceptable           = 0.00
     *                   TmRL-FRL  0.5 × max(0.0, 0.5) = 0.25
     *                   BRL-IPRL  0.5 × max(1.0, 0.5) = 0.50
     *                   TRL-IPRL  1.0 × max(0.0, 0.5) = 0.50   = 2.25
     *   afinidad etapa  validación ∈ {validación, crecimiento} = 0.80
     *   penalización    promedio 3.5 < nivel_min 4             = −2.00
     *                                                    total =  5.55
     */
    it('puntúa Consultoría en 5.55, con el desglose término a término esperado', () => {
      const { rankingPre } = evaluar(HECHOS_AGROCONECTA);
      const consultoria = rankingPre.find(
        (c) => c.nombreServicio === 'Consultoría',
      );

      expect(consultoria).toBeDefined();
      expect(consultoria!.aportes.cuelloBotella.valor).toBeCloseTo(1.5, 3);
      expect(consultoria!.aportes.brechas.valor).toBeCloseTo(3.0, 3);
      expect(consultoria!.aportes.desequilibrios.valor).toBeCloseTo(2.25, 3);
      expect(consultoria!.aportes.afinidadEtapa.valor).toBeCloseTo(0.8, 3);
      expect(consultoria!.aportes.penalizacionRango.valor).toBeCloseTo(2.0, 3);
      expect(consultoria!.aportes.penalizacionRango.aplicada).toBe(true);
      expect(consultoria!.total).toBeCloseTo(5.55, 3);
    });

    it('produce el ranking pre-excepción esperado', () => {
      const { rankingPre } = evaluar(HECHOS_AGROCONECTA);

      expect(
        rankingPre.map((c) => [c.nombreServicio, c.total] as const),
      ).toEqual([
        ['Consultoría', 5.55],
        ['Mentoría', 3.8],
        ['Proyectos Integradores', 3.05],
        ['Formación', 3.0],
        ['Retos en el Aula', 2.9],
      ]);
    });

    it('conserva la etiqueta ordinal de origen junto a cada aporte', () => {
      const { rankingPre } = evaluar(HECHOS_AGROCONECTA);
      const consultoria = rankingPre.find(
        (c) => c.nombreServicio === 'Consultoría',
      )!;

      // Es lo que permite explicar "es secundario en IPRL" en vez de
      // exponer el 0.5 de la calibración.
      expect(consultoria.aportes.cuelloBotella.detalle).toEqual([
        { dimension: 'IPRL', etiquetaOrigen: 'secundario', valor: 0.5 },
      ]);
    });
  });

  describe('capa 3 · ajustes puntuales', () => {
    it('activa E-01 y descarta E-02 y E-03, en ese orden de prioridad', () => {
      const { activadas, descartadas } = evaluar(HECHOS_AGROCONECTA);

      expect(activadas.map((e) => e.codigo)).toEqual(['E-01']);
      expect(descartadas.map((e) => e.codigo)).toEqual(['E-02', 'E-03']);
    });

    it('E-01 fuerza Consultoría y deja constancia de que era una decisión, no un cálculo', () => {
      const { activadas } = evaluar(HECHOS_AGROCONECTA);
      const e01 = activadas[0];

      expect(e01.accion).toBe('FORZAR');
      expect(e01.servicioObjetivo).toBe('Consultoría');
      expect(e01.motivoDeclarado).toContain('riesgo legal crítico');
      // Consultoría ya era primera por cálculo; la traza tiene que decir
      // que además se fijó explícitamente, porque para la auditoría no es
      // lo mismo "ganó" que "se decidió que ganara".
      expect(e01.efecto).toContain('ya ocupaba el puesto 1');
      expect(e01.rankingAntes[0].nombreServicio).toBe('Consultoría');
      expect(e01.rankingDespues[0].nombreServicio).toBe('Consultoría');
    });

    it('descarta E-02 porque el cuello de botella es IPRL', () => {
      const { descartadas } = evaluar(HECHOS_AGROCONECTA);
      // brechas.conteo >= 3 se cumple, pero NOT(cuelloBotella contiene IPRL)
      // no: el guard es justamente lo que impide que un ajuste pensado para
      // perfiles difusos desplace a un servicio elegido por una urgencia
      // concreta.
      expect(descartadas.find((e) => e.codigo === 'E-02')?.razon).toContain(
        'no se cumple',
      );
    });
  });

  describe('resultado final', () => {
    it('recomienda Consultoría, con Mentoría y Proyectos Integradores como alternativas', () => {
      const { rankingPost } = evaluar(HECHOS_AGROCONECTA);
      const sobreUmbral = rankingPost.filter(
        (c) => c.total >= PARAMETROS_SCORING.umbralMinimo,
      );

      expect(sobreUmbral[0].nombreServicio).toBe('Consultoría');
      expect(
        sobreUmbral
          .slice(1, 1 + PARAMETROS_SCORING.nAlternativas)
          .map((c) => c.nombreServicio),
      ).toEqual(['Mentoría', 'Proyectos Integradores']);
    });

    it('todos los candidatos elegibles superan el umbral mínimo de 2.5', () => {
      const { rankingPost } = evaluar(HECHOS_AGROCONECTA);

      expect(
        rankingPost.every((c) => c.total >= PARAMETROS_SCORING.umbralMinimo),
      ).toBe(true);
    });
  });

  describe('sensibilidad del caso', () => {
    /**
     * Contraprueba del guard de E-02. Si el cuello de botella no fuera
     * IPRL, E-01 no se activaría y E-02 sí, promoviendo Retos en el Aula
     * dos posiciones. Verificarlo es lo que demuestra que el guard hace
     * algo y que la cascada de prioridades no es decorativa.
     */
    it('sin cuello de botella en IPRL, E-01 calla y E-02 promueve Retos en el Aula', () => {
      const sinIprl: HechosDiagnostico = {
        ...HECHOS_AGROCONECTA,
        nivelPorDimension: { ...NIVELES, IPRL: 5, BRL: 1 },
        cuellosBotella: ['BRL'],
        brechas: ['BRL', 'FRL', 'CRL'],
        desequilibrios: HECHOS_AGROCONECTA.desequilibrios.map((d) =>
          d.izquierda === 'TRL' && d.derecha === 'IPRL'
            ? { ...d, diferencia: 1, clasificacion: 'ACEPTABLE' as const }
            : d,
        ),
      };

      const { activadas, descartadas } = evaluar(sinIprl);

      expect(descartadas.map((e) => e.codigo)).toContain('E-01');
      expect(activadas.map((e) => e.codigo)).toContain('E-02');

      const e02 = activadas.find((e) => e.codigo === 'E-02')!;
      expect(e02.accion).toBe('PROMOVER');
      expect(e02.servicioObjetivo).toBe('Retos en el Aula');

      const antes = e02.rankingAntes.findIndex(
        (c) => c.nombreServicio === 'Retos en el Aula',
      );
      const despues = e02.rankingDespues.findIndex(
        (c) => c.nombreServicio === 'Retos en el Aula',
      );
      expect(despues).toBe(Math.max(0, antes - 2));
    });
  });
});

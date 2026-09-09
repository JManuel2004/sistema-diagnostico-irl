import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DimensionCode } from '@innlab/contracts';
import type {
  ActiveConfigurationRepositoryPort,
  ConfiguracionResuelta,
} from '../../domain/ports/active-configuration.repository.port.js';
import { EscalaCalibracion } from '../../domain/value-objects/escala-calibracion.vo.js';
import type { FichaOrdinal } from '../../domain/value-objects/ficha-ordinal.vo.js';
import type { ReglaElegibilidadCompilada } from '../../domain/services/eligibility-filter.service.js';
import type {
  AccionExcepcion,
  ReglaExcepcionCompilada,
} from '../../domain/services/exception-engine.service.js';
import { PredicateCompilerService } from '../../domain/services/predicate-compiler.service.js';
import { VersionConfiguracionOrm } from './version-configuracion.orm-entity.js';
import { SnapshotCalibracionOrm } from './snapshot-calibracion.orm-entity.js';
import { ValorEtiquetaCalibracionOrm } from './valor-etiqueta-calibracion.orm-entity.js';
import { SnapshotParametrosOrm } from './snapshot-parametros.orm-entity.js';
import { FichaOrdinalPublicadaOrm } from './ficha-ordinal-publicada.orm-entity.js';
import { IntensidadOrdinalPublicadaOrm } from './intensidad-ordinal-publicada.orm-entity.js';
import { ReglaElegibilidadPublicadaOrm } from './regla-elegibilidad-publicada.orm-entity.js';
import { ReglaExcepcionPublicadaOrm } from './regla-excepcion-publicada.orm-entity.js';
import { ServicioPortafolioOrm } from './servicio-portafolio.orm-entity.js';
import { DimensionOrm } from '../../../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';

/**
 * Adaptador de lectura de la configuración publicada.
 *
 * Los predicados se recompilan al leer, no se confía en que el `jsonb`
 * almacenado sea válido. Una versión publicada es inmutable, así que en
 * teoría bastaría con compilarla al publicar; en la práctica, una
 * restauración de base de datos o una edición manual pueden dejar un
 * predicado corrupto, y prefiero que eso falle al cargar la
 * configuración antes que a mitad de una evaluación.
 */
@Injectable()
export class TypeOrmActiveConfigurationRepository
  implements ActiveConfigurationRepositoryPort
{
  private readonly compiler = new PredicateCompilerService();

  constructor(
    @InjectRepository(VersionConfiguracionOrm)
    private readonly versiones: Repository<VersionConfiguracionOrm>,
    @InjectRepository(SnapshotCalibracionOrm)
    private readonly calibraciones: Repository<SnapshotCalibracionOrm>,
    @InjectRepository(ValorEtiquetaCalibracionOrm)
    private readonly etiquetas: Repository<ValorEtiquetaCalibracionOrm>,
    @InjectRepository(SnapshotParametrosOrm)
    private readonly parametros: Repository<SnapshotParametrosOrm>,
    @InjectRepository(FichaOrdinalPublicadaOrm)
    private readonly fichas: Repository<FichaOrdinalPublicadaOrm>,
    @InjectRepository(IntensidadOrdinalPublicadaOrm)
    private readonly intensidades: Repository<IntensidadOrdinalPublicadaOrm>,
    @InjectRepository(ReglaElegibilidadPublicadaOrm)
    private readonly elegibilidad: Repository<ReglaElegibilidadPublicadaOrm>,
    @InjectRepository(ReglaExcepcionPublicadaOrm)
    private readonly excepciones: Repository<ReglaExcepcionPublicadaOrm>,
    @InjectRepository(ServicioPortafolioOrm)
    private readonly servicios: Repository<ServicioPortafolioOrm>,
    @InjectRepository(DimensionOrm)
    private readonly dimensiones: Repository<DimensionOrm>,
  ) {}

  async loadActive(): Promise<ConfiguracionResuelta | null> {
    const version = await this.versiones.findOne({
      where: { estado: 'VIGENTE' },
    });
    return version ? this.resolver(version) : null;
  }

  async loadByVersion(numero: number): Promise<ConfiguracionResuelta | null> {
    const version = await this.versiones.findOne({ where: { numero } });
    return version ? this.resolver(version) : null;
  }

  private async resolver(
    version: VersionConfiguracionOrm,
  ): Promise<ConfiguracionResuelta> {
    const [
      calibracion,
      peldanos,
      params,
      fichasRows,
      elegRows,
      excRows,
      serviciosRows,
      dimRows,
    ] = await Promise.all([
      this.calibraciones.findOneByOrFail({
        idSnapshotCalibracion: version.idSnapshotCalibracion,
      }),
      this.etiquetas.find({
        where: { idSnapshotCalibracion: version.idSnapshotCalibracion },
        order: { ordenMonotonia: 'ASC' },
      }),
      this.parametros.findOneByOrFail({
        idSnapshotParametros: version.idSnapshotParametros,
      }),
      this.fichas.find({
        where: { idVersionConfiguracion: version.idVersionConfiguracion },
      }),
      this.elegibilidad.find({
        where: { idVersionConfiguracion: version.idVersionConfiguracion },
      }),
      this.excepciones.find({
        where: { idVersionConfiguracion: version.idVersionConfiguracion },
        order: { prioridadOrden: 'ASC' },
      }),
      this.servicios.find(),
      this.dimensiones.find(),
    ]);

    const nombrePorServicio = new Map(
      serviciosRows.map((s) => [s.idServicio, s.nombre] as const),
    );
    const codigoPorDimension = new Map(
      dimRows.map((d) => [d.idDimension, d.codigo as DimensionCode] as const),
    );

    const intensidadesRows = await this.intensidades.find({
      where: fichasRows.map((f) => ({ idFichaPublicada: f.idFichaPublicada })),
    });
    const intensidadesPorFicha = new Map<string, IntensidadOrdinalPublicadaOrm[]>();
    for (const row of intensidadesRows) {
      const lista = intensidadesPorFicha.get(row.idFichaPublicada) ?? [];
      lista.push(row);
      intensidadesPorFicha.set(row.idFichaPublicada, lista);
    }

    const fichas: FichaOrdinal[] = fichasRows.map((f) => {
      const intensidades = new Map<DimensionCode, string>();
      for (const i of intensidadesPorFicha.get(f.idFichaPublicada) ?? []) {
        const codigo = codigoPorDimension.get(i.idDimension);
        if (codigo) intensidades.set(codigo, i.etiqueta);
      }
      return {
        idServicio: f.idServicio,
        nombreServicio: nombrePorServicio.get(f.idServicio) ?? String(f.idServicio),
        nivelMin: f.nivelMin,
        nivelMax: f.nivelMax,
        // Lista separada por comas; `filter` descarta el caso de cadena vacía.
        etapasPertinentes: f.etapasPertinentes
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e.length > 0),
        intensidades,
      };
    });

    const reglasElegibilidad: ReglaElegibilidadCompilada[] = elegRows.map((r) => ({
      idRegla: r.idReglaEligPublicada,
      idServicio: r.idServicio,
      expresion: this.compiler.compile(r.predicado, 'BOOLEANO'),
      mensajeExclusion: r.mensajeExclusion,
    }));

    const reglasExcepcion: ReglaExcepcionCompilada[] = excRows.map((r) => ({
      codigo: r.codigo,
      prioridadOrden: r.prioridadOrden,
      expresion: this.compiler.compile(r.predicado, 'CON_GRADO'),
      accion: r.accion as AccionExcepcion,
      idServicioObjetivo: r.idServicioObjetivo,
      posiciones: r.posiciones,
      motivoDeclarado: r.motivoDeclarado,
    }));

    return {
      idVersionConfiguracion: version.idVersionConfiguracion,
      numeroVersion: version.numero,
      idSnapshotCalibracion: calibracion.idSnapshotCalibracion,
      numeroSnapshotCalibracion: calibracion.numero,
      idSnapshotParametros: params.idSnapshotParametros,
      numeroSnapshotParametros: params.numero,
      escala: EscalaCalibracion.create(
        peldanos.map((p) => ({
          etiqueta: p.etiqueta,
          valor: p.valorNumerico,
          orden: p.ordenMonotonia,
        })),
      ),
      parametros: {
        pesoCuelloBotella: params.pesoCuelloBotella,
        pesoBrecha: params.pesoBrecha,
        pesoDesequilibrioModerado: params.pesoDesequilibrioModerado,
        pesoDesequilibrioCritico: params.pesoDesequilibrioCritico,
        pesoAfinidadEtapa: params.pesoAfinidadEtapa,
        penalizacionFueraRango: params.penalizacionFueraRango,
        umbralMinimo: params.umbralMinimo,
        nAlternativas: params.nAlternativas,
      },
      fichas,
      reglasElegibilidad,
      reglasExcepcion,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DimensionCode } from '@innlab/contracts';
import type {
  DependencyEdgeSnapshot,
  DependencyGraphRepositoryPort,
  DimensionMinimumSnapshot,
} from '../../domain/ports/dependency-graph.repository.port.js';
import { DependenciaDimensionOrm } from './dependencia-dimension.orm-entity.js';
import { DimensionOrm } from '../../../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';

/**
 * Adaptador de lectura del grafo sobre `irl_catalog`.
 *
 * Traduce los ids enteros de `dependencia_dimension` a códigos de
 * dimensión antes de cruzar la frontera del dominio: el motor razona en
 * `TRL`/`CRL`/…, nunca en claves primarias, que además son IDENTITY y no
 * son estables entre entornos.
 */
@Injectable()
export class TypeOrmDependencyGraphRepository
  implements DependencyGraphRepositoryPort
{
  constructor(
    @InjectRepository(DependenciaDimensionOrm)
    private readonly dependencias: Repository<DependenciaDimensionOrm>,
    @InjectRepository(DimensionOrm)
    private readonly dimensiones: Repository<DimensionOrm>,
  ) {}

  async findActiveEdges(): Promise<DependencyEdgeSnapshot[]> {
    const [filas, codigoPorId] = await Promise.all([
      // Solo las activas: una arista desactivada sigue en la tabla pero
      // no participa del cálculo.
      this.dependencias.find({ where: { activa: true } }),
      this.codigoPorId(),
    ]);

    return filas.flatMap((f) => {
      const origen = codigoPorId.get(f.idDimensionOrigen);
      const destino = codigoPorId.get(f.idDimensionDestino);
      // Las FKs garantizan que ambos existan; el filtro es defensa en
      // profundidad frente a una fila huérfana tras una restauración.
      if (!origen || !destino) return [];
      return [
        {
          origen,
          destino,
          nivelMinimoRequerido: f.nivelMinimoRequerido,
        },
      ];
    });
  }

  async findExpectedMinimums(): Promise<DimensionMinimumSnapshot[]> {
    const filas = await this.dimensiones.find({ order: { orden: 'ASC' } });
    return filas.map((d) => ({
      dimension: d.codigo as DimensionCode,
      nivelMinimoEsperado: d.nivelMinimoEsperado,
    }));
  }

  private async codigoPorId(): Promise<ReadonlyMap<number, DimensionCode>> {
    const filas = await this.dimensiones.find();
    return new Map(
      filas.map((d) => [d.idDimension, d.codigo as DimensionCode] as const),
    );
  }
}

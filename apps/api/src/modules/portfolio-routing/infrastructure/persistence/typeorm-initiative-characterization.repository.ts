import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Characterization } from '@innlab/contracts';
import type { InitiativeCharacterizationPort } from '../../domain/ports/initiative-characterization.port.js';
import { IniciativaOrm } from '../../../initiative/infrastructure/persistence/iniciativa.orm-entity.js';
import { EtapaIniciativaOrm } from '../../../initiative/infrastructure/persistence/etapa-iniciativa.orm-entity.js';
import { SectorOrm } from '../../../initiative/infrastructure/persistence/sector.orm-entity.js';

const NO_CHARACTERIZATION: Characterization = {
  stage: null,
  sector: null,
  teamSize: null,
  academicLinkage: null,
};

/**
 * Adaptador de solo lectura sobre `irl_diagnostic.iniciativa`.
 *
 * Devuelve la caracterización vacía cuando no hay iniciativa registrada,
 * que hoy es siempre: ningún caso de uso escribe esa tabla. El motor
 * trata los `null` como "no coincide" / "no excluye" y lo anota en la
 * traza, para que una recomendación calculada sin caracterización se vea
 * como tal en vez de degradarse en silencio.
 *
 * Las entidades de `initiative` conservan su vocabulario en español: son
 * de otro módulo y se renombran en su propio lote. La traducción ocurre
 * al cruzar el límite, que es donde empieza el contrato de este módulo.
 */
@Injectable()
export class TypeOrmInitiativeCharacterizationRepository
  implements InitiativeCharacterizationPort
{
  constructor(
    @InjectRepository(IniciativaOrm)
    private readonly iniciativas: Repository<IniciativaOrm>,
    @InjectRepository(EtapaIniciativaOrm)
    private readonly etapas: Repository<EtapaIniciativaOrm>,
    @InjectRepository(SectorOrm)
    private readonly sectores: Repository<SectorOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<Characterization> {
    const iniciativa = await this.iniciativas.findOne({
      where: { idDiagnostico: diagnosticId },
    });
    if (!iniciativa) return NO_CHARACTERIZATION;

    const [etapa, sector] = await Promise.all([
      iniciativa.idEtapa === null
        ? null
        : this.etapas.findOne({ where: { idEtapa: iniciativa.idEtapa } }),
      this.sectores.findOne({ where: { idSector: iniciativa.idSector } }),
    ]);

    return {
      stage: etapa?.codigo ?? null,
      sector: sector?.nombre ?? null,
      teamSize: iniciativa.tamanoEquipo,
      academicLinkage: iniciativa.vinculacionAcademica,
    };
  }
}

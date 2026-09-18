import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosisModule } from '../diagnosis/diagnosis.module.js';

import { InitiativeOrm } from './infrastructure/database/orm-entities/initiative.orm-entity.js';
import { ConsentOrm } from './infrastructure/database/orm-entities/consent.orm-entity.js';
import { SectorOrm } from './infrastructure/database/orm-entities/sector.orm-entity.js';
import { InitiativeStageOrm } from './infrastructure/database/orm-entities/initiative-stage.orm-entity.js';

import { TypeOrmInitiativeRepository } from './infrastructure/database/repositories/typeorm-initiative.repository.js';
import { TypeOrmConsentRepository } from './infrastructure/database/repositories/typeorm-consent.repository.js';
import { TypeOrmInitiativeCatalogRepository } from './infrastructure/database/repositories/typeorm-initiative-catalog.repository.js';

import { INITIATIVE_REPOSITORY } from './domain/repositories/initiative.repository.port.js';
import { CONSENT_REPOSITORY } from './domain/repositories/consent.repository.port.js';
import { INITIATIVE_CATALOG_REPOSITORY } from './domain/repositories/initiative-catalog.port.js';

import { RegisterInitiativeUseCase } from './application/use-cases/register-initiative.use-case.js';
import { GetInitiativeUseCase } from './application/use-cases/get-initiative.use-case.js';
import { RecordConsentUseCase } from './application/use-cases/record-consent.use-case.js';
import { GetConsentUseCase } from './application/use-cases/get-consent.use-case.js';
import { ListMyDiagnosesUseCase } from './application/use-cases/list-my-diagnoses.use-case.js';
import { GetInitiativeCharacterizationUseCase } from './application/use-cases/get-initiative-characterization.use-case.js';

import { InitiativeController } from './presentation/controllers/initiative.controller.js';
import { ConsentController } from './presentation/controllers/consent.controller.js';
import { MyDiagnosesController } from './presentation/controllers/my-diagnoses.controller.js';

/**
 * `InitiativeModule` — Supporting bounded context for the initiative
 * profile (RF-04/HU-06) and privacy consent (RF-03/HU-05), promoted from
 * three ORM-only entities with no domain layer (backlog 1.5) to its own
 * module, per `convenciones-objetivo.md` §1.1/§1.3.
 *
 * `consent` lives here, not in `diagnosis/` — the resolved business
 * decision (§1.3) is that consent travels with the rest of the
 * initiative profile rather than staying as a gate inside the
 * questionnaire flow.
 *
 * Imports `DiagnosisModule` for two reasons: `ListMyDiagnosesUseCase`
 * reads `DIAGNOSIS_REPOSITORY` directly (a Supporting context reading a
 * Core context's exported port — allowed, `convenciones-objetivo.md`
 * §1.1 case (b)), and both `RegisterInitiativeUseCase` and
 * `RecordConsentUseCase` take a `diagnosticId` whose validity this
 * module does not itself verify — that check is deferred to a future
 * phase, not invented here.
 *
 * `GetInitiativeCharacterizationUseCase` is exported for
 * `routing/` to consume — see the note on that use case for
 * what it replaces.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      InitiativeOrm,
      ConsentOrm,
      SectorOrm,
      InitiativeStageOrm,
    ]),
    DiagnosisModule,
  ],
  providers: [
    { provide: INITIATIVE_REPOSITORY, useClass: TypeOrmInitiativeRepository },
    { provide: CONSENT_REPOSITORY, useClass: TypeOrmConsentRepository },
    {
      provide: INITIATIVE_CATALOG_REPOSITORY,
      useClass: TypeOrmInitiativeCatalogRepository,
    },
    RegisterInitiativeUseCase,
    GetInitiativeUseCase,
    RecordConsentUseCase,
    GetConsentUseCase,
    ListMyDiagnosesUseCase,
    GetInitiativeCharacterizationUseCase,
  ],
  controllers: [InitiativeController, ConsentController, MyDiagnosesController],
  exports: [GetInitiativeCharacterizationUseCase],
})
export class InitiativeModule {}

import { Module } from '@nestjs/common';
import { applicationProvider } from '../../shared/kernel/infrastructure/nest/application-provider.js';
import { EVENT_PUBLISHER } from '../../shared/kernel/application/ports/event-publisher.port.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosisModule } from '../diagnosis/diagnosis.module.js';

import { InitiativeOrm } from './infrastructure/database/orm-entities/initiative.orm-entity.js';
import { InitiativeProfileOrm } from './infrastructure/database/orm-entities/initiative-profile.orm-entity.js';
import { ConsentOrm } from './infrastructure/database/orm-entities/consent.orm-entity.js';
import { ConsentTermsOrm } from './infrastructure/database/orm-entities/consent-terms.orm-entity.js';
import { SectorOrm } from './infrastructure/database/orm-entities/sector.orm-entity.js';
import { InitiativeStageOrm } from './infrastructure/database/orm-entities/initiative-stage.orm-entity.js';

import { TypeOrmInitiativeRepository } from './infrastructure/database/repositories/typeorm-initiative.repository.js';
import { TypeOrmInitiativeProfileRepository } from './infrastructure/database/repositories/typeorm-initiative-profile.repository.js';
import { TypeOrmConsentRepository } from './infrastructure/database/repositories/typeorm-consent.repository.js';
import { TypeOrmConsentTermsRepository } from './infrastructure/database/repositories/typeorm-consent-terms.repository.js';
import { TypeOrmInitiativeCatalogRepository } from './infrastructure/database/repositories/typeorm-initiative-catalog.repository.js';

import { INITIATIVE_REPOSITORY } from './domain/repositories/initiative.repository.port.js';
import { INITIATIVE_PROFILE_REPOSITORY } from './domain/repositories/initiative-profile.repository.port.js';
import { CONSENT_REPOSITORY } from './domain/repositories/consent.repository.port.js';
import { CONSENT_TERMS_CATALOG } from './domain/repositories/consent-terms.port.js';
import { INITIATIVE_CATALOG_REPOSITORY } from './domain/repositories/initiative-catalog.port.js';
import { DIAGNOSTIC_OWNERSHIP } from './domain/repositories/diagnostic-ownership.port.js';
import { DiagnosisOwnershipAdapter } from './infrastructure/diagnosis-ownership.adapter.js';
import { USER_DIAGNOSES } from './application/ports/user-diagnoses.port.js';
import { UserDiagnosesAdapter } from './infrastructure/user-diagnoses.adapter.js';

import { ListMyInitiativesUseCase } from './application/use-cases/list-my-initiatives.use-case.js';
import { CreateInitiativeUseCase } from './application/use-cases/create-initiative.use-case.js';
import { RecordConsentUseCase } from './application/use-cases/record-consent.use-case.js';
import { GetCurrentConsentTermsUseCase } from './application/use-cases/get-current-consent-terms.use-case.js';
import { RegisterInitiativeProfileUseCase } from './application/use-cases/register-initiative-profile.use-case.js';
import { GetInitiativeProfileUseCase } from './application/use-cases/get-initiative-profile.use-case.js';
import { GetInitiativeCharacterizationUseCase } from './application/use-cases/get-initiative-characterization.use-case.js';
import { ListMyDiagnosesUseCase } from './application/use-cases/list-my-diagnoses.use-case.js';
import {
  ListSectorsUseCase,
  ListStagesUseCase,
} from './application/use-cases/list-initiative-catalog.use-case.js';

import { InitiativesController } from './presentation/controllers/initiatives.controller.js';
import { InitiativeController } from './presentation/controllers/initiative.controller.js';
import { ConsentTermsController } from './presentation/controllers/consent-terms.controller.js';
import { MyDiagnosesController } from './presentation/controllers/my-diagnoses.controller.js';
import { InitiativeCatalogController } from './presentation/controllers/initiative-catalog.controller.js';

/**
 * `InitiativeModule` — Supporting bounded context for the initiatives of a
 * user (RF-04/HU-06) and their privacy consent (RF-03/HU-05).
 *
 * An initiative has an identity of its own: it is created with the
 * acceptance of its consent, the consent is a history per initiative, and
 * each diagnostic keeps a snapshot of the initiative's profile — the
 * characterization `routing/` reads.
 *
 * Imports `DiagnosisModule` for its exported read queries, reached through
 * ports declared here: `DiagnosticOwnershipPort` (the diagnostic exists,
 * belongs to the caller and whether its deep analysis was accepted) and
 * `UserDiagnosesPort` (the user's diagnostics).
 *
 * Registering a profile publishes `InitiativeRegisteredEvent`; `diagnosis/`
 * listens and moves its own state machine — `initiative/` never calls it.
 *
 * `GetInitiativeCharacterizationUseCase` is exported for `routing/`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      InitiativeOrm,
      InitiativeProfileOrm,
      ConsentOrm,
      ConsentTermsOrm,
      SectorOrm,
      InitiativeStageOrm,
    ]),
    DiagnosisModule,
  ],
  providers: [
    { provide: INITIATIVE_REPOSITORY, useClass: TypeOrmInitiativeRepository },
    { provide: INITIATIVE_PROFILE_REPOSITORY, useClass: TypeOrmInitiativeProfileRepository },
    { provide: CONSENT_REPOSITORY, useClass: TypeOrmConsentRepository },
    { provide: CONSENT_TERMS_CATALOG, useClass: TypeOrmConsentTermsRepository },
    { provide: INITIATIVE_CATALOG_REPOSITORY, useClass: TypeOrmInitiativeCatalogRepository },
    { provide: DIAGNOSTIC_OWNERSHIP, useClass: DiagnosisOwnershipAdapter },
    { provide: USER_DIAGNOSES, useClass: UserDiagnosesAdapter },
    applicationProvider(ListMyInitiativesUseCase, [INITIATIVE_REPOSITORY, INITIATIVE_PROFILE_REPOSITORY, CONSENT_REPOSITORY, CONSENT_TERMS_CATALOG, INITIATIVE_CATALOG_REPOSITORY]),
    applicationProvider(CreateInitiativeUseCase, [INITIATIVE_REPOSITORY, CONSENT_TERMS_CATALOG]),
    applicationProvider(RecordConsentUseCase, [INITIATIVE_REPOSITORY, CONSENT_REPOSITORY, CONSENT_TERMS_CATALOG]),
    applicationProvider(GetCurrentConsentTermsUseCase, [CONSENT_TERMS_CATALOG]),
    applicationProvider(RegisterInitiativeProfileUseCase, [INITIATIVE_REPOSITORY, INITIATIVE_PROFILE_REPOSITORY, INITIATIVE_CATALOG_REPOSITORY, CONSENT_REPOSITORY, CONSENT_TERMS_CATALOG, DIAGNOSTIC_OWNERSHIP, EVENT_PUBLISHER]),
    applicationProvider(GetInitiativeProfileUseCase, [INITIATIVE_PROFILE_REPOSITORY, INITIATIVE_CATALOG_REPOSITORY, DIAGNOSTIC_OWNERSHIP]),
    applicationProvider(GetInitiativeCharacterizationUseCase, [INITIATIVE_PROFILE_REPOSITORY, INITIATIVE_CATALOG_REPOSITORY]),
    applicationProvider(ListMyDiagnosesUseCase, [USER_DIAGNOSES]),
    applicationProvider(ListSectorsUseCase, [INITIATIVE_CATALOG_REPOSITORY]),
    applicationProvider(ListStagesUseCase, [INITIATIVE_CATALOG_REPOSITORY]),
  ],
  controllers: [
    InitiativesController,
    InitiativeController,
    ConsentTermsController,
    MyDiagnosesController,
    InitiativeCatalogController,
  ],
  // Consumed by RoutingModule: the characterization it scores against, and
  // the stage codes of the services' ordinal profiles. ReportingModule reads
  // the initiative profile of a diagnostic for the report.
  exports: [GetInitiativeCharacterizationUseCase, ListStagesUseCase, GetInitiativeProfileUseCase],
})
export class InitiativeModule {}

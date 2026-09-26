import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  ConsentTermsCatalogPort,
  ConsentTermsEntry,
} from '../../../domain/repositories/consent-terms.port.js';
import { ConsentTermsOrm } from '../orm-entities/consent-terms.orm-entity.js';

@Injectable()
export class TypeOrmConsentTermsRepository implements ConsentTermsCatalogPort {
  constructor(
    @InjectRepository(ConsentTermsOrm)
    private readonly orm: Repository<ConsentTermsOrm>,
  ) {}

  async findCurrent(): Promise<ConsentTermsEntry | null> {
    const [row] = await this.orm.find({ order: { publishedAt: 'DESC' }, take: 1 });
    return row
      ? {
          version: row.version,
          title: row.title,
          sections: row.sections,
          checkboxLabel: row.checkboxLabel,
          publishedAt: row.publishedAt,
        }
      : null;
  }
}

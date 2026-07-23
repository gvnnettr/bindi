import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentDefinition } from '@servis/db';

@Controller('document-definitions')
export class DocumentDefinitionsPublicController {
  constructor(
    @InjectRepository(DocumentDefinition)
    private readonly repo: Repository<DocumentDefinition>,
  ) {}

  @Get()
  list() {
    return this.repo.find({
      where: { active: true },
      order: { scope: 'ASC', sortOrder: 'ASC' },
    });
  }
}

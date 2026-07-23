import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '@servis/db';

@Controller('schools')
export class SchoolsController {
  constructor(
    @InjectRepository(School) private readonly schools: Repository<School>,
  ) {}

  @Get('public')
  list() {
    return this.schools.find({
      where: { active: true },
      order: { city: 'ASC', name: 'ASC' },
    });
  }
}

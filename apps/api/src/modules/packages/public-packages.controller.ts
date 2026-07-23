import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackageEntity } from '@servis/db';

@Controller('public-packages')
export class PublicPackagesController {
  constructor(
    @InjectRepository(PackageEntity)
    private readonly packages: Repository<PackageEntity>,
  ) {}

  @Get()
  async list() {
    const rows = await this.packages.find({ where: { active: true } });
    return rows.map((p) => ({
      code: p.code,
      name: p.name,
      monthlyPrice: Number(p.monthlyPrice),
    }));
  }
}

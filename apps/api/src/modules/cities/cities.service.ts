import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnabledCity } from '@servis/db';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(EnabledCity) private readonly repo: Repository<EnabledCity>,
  ) {}

  async listEnabled(): Promise<string[]> {
    const rows = await this.repo.find({ order: { city: 'ASC' } });
    return rows.map((r) => r.city);
  }

  async listAdmin(): Promise<{ id: string; city: string; createdAt: Date }[]> {
    const rows = await this.repo.find({ order: { city: 'ASC' } });
    return rows.map((r) => ({ id: r.id, city: r.city, createdAt: r.createdAt }));
  }

  async add(city: string): Promise<{ id: string; city: string }> {
    const normalized = city.trim();
    if (!normalized) throw new BadRequestException('Şehir adı gerekli');
    const existing = await this.repo.findOne({ where: { city: normalized } });
    if (existing) return { id: existing.id, city: existing.city };
    const created = this.repo.create({ city: normalized });
    await this.repo.save(created);
    return { id: created.id, city: created.city };
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.repo.delete({ id });
    return { ok: true };
  }
}

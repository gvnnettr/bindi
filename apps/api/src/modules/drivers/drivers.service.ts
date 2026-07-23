import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Driver,
  DriverDocument,
  DocumentDefinition,
} from '@servis/db';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(DriverDocument)
    private readonly docs: Repository<DriverDocument>,
    @InjectRepository(DocumentDefinition)
    private readonly defs: Repository<DocumentDefinition>,
  ) {}

  async listMine(providerId: string) {
    const rows = await this.drivers.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
    const defs = await this.defs.find({
      where: { scope: 'driver' as any, active: true, required: true },
    });
    const results = [];
    for (const d of rows) {
      const docs = await this.docs.find({ where: { driverId: d.id } });
      const approvedIds = new Set(
        docs.filter((x) => x.status === 'approved').map((x) => x.definitionId),
      );
      const missing = defs.filter((def) => !approvedIds.has(def.id));
      results.push({
        id: d.id,
        name: d.name,
        phone: d.phone,
        tcNo: d.tcNo,
        licenseClass: d.licenseClass,
        active: d.active,
        note: d.note,
        createdAt: d.createdAt,
        docsApproved: approvedIds.size,
        docsRequired: defs.length,
        missingDocs: missing.map((m) => m.name),
      });
    }
    return results;
  }

  async create(
    providerId: string,
    input: {
      name: string;
      phone: string;
      tcNo?: string;
      licenseClass?: string;
      note?: string;
    },
  ) {
    if (input.tcNo && !/^\d{11}$/.test(input.tcNo)) {
      throw new BadRequestException('TC No 11 haneli olmalı');
    }
    const d = this.drivers.create({
      providerId,
      name: input.name,
      phone: input.phone,
      tcNo: input.tcNo ?? null,
      licenseClass: input.licenseClass ?? null,
      note: input.note ?? null,
    });
    await this.drivers.save(d);
    return { ok: true, id: d.id };
  }

  private async assertOwn(providerId: string, driverId: string) {
    const d = await this.drivers.findOne({
      where: { id: driverId, providerId },
    });
    if (!d) throw new NotFoundException('Şoför bulunamadı');
    return d;
  }

  async detail(providerId: string, driverId: string) {
    const d = await this.assertOwn(providerId, driverId);
    const defs = await this.defs.find({
      where: { scope: 'driver' as any, active: true },
      order: { sortOrder: 'ASC' },
    });
    const docs = await this.docs.find({ where: { driverId: d.id } });
    const byDef = new Map(docs.map((x) => [x.definitionId, x]));
    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      tcNo: d.tcNo,
      licenseClass: d.licenseClass,
      active: d.active,
      note: d.note,
      createdAt: d.createdAt,
      documents: defs.map((def) => ({
        definition: {
          id: def.id,
          code: def.code,
          name: def.name,
          required: def.required,
          requiresExpiry: def.requiresExpiry,
          description: def.description,
        },
        document: byDef.get(def.id)
          ? {
              id: byDef.get(def.id)!.id,
              fileUrl: byDef.get(def.id)!.fileUrl,
              originalName: byDef.get(def.id)!.originalName,
              issuedAt: byDef.get(def.id)!.issuedAt,
              expiresAt: byDef.get(def.id)!.expiresAt,
              status: byDef.get(def.id)!.status,
              rejectionReason: byDef.get(def.id)!.rejectionReason,
              createdAt: byDef.get(def.id)!.createdAt,
            }
          : null,
      })),
    };
  }

  async update(
    providerId: string,
    driverId: string,
    input: Partial<{
      name: string;
      phone: string;
      tcNo: string | null;
      licenseClass: string | null;
      active: boolean;
      note: string | null;
    }>,
  ) {
    const d = await this.assertOwn(providerId, driverId);
    if (input.tcNo && !/^\d{11}$/.test(input.tcNo)) {
      throw new BadRequestException('TC No 11 haneli olmalı');
    }
    Object.assign(d, input);
    await this.drivers.save(d);
    return { ok: true };
  }

  async remove(providerId: string, driverId: string) {
    const d = await this.assertOwn(providerId, driverId);
    await this.drivers.remove(d);
    return { ok: true };
  }

  async upsertDocument(
    providerId: string,
    driverId: string,
    input: {
      definitionId: string;
      fileUrl: string;
      originalName: string;
      issuedAt: Date | null;
      expiresAt: Date | null;
    },
  ) {
    await this.assertOwn(providerId, driverId);
    const def = await this.defs.findOne({ where: { id: input.definitionId } });
    if (!def) throw new NotFoundException('Belge tanımı bulunamadı');
    let doc = await this.docs.findOne({
      where: { driverId, definitionId: input.definitionId },
    });
    if (doc) {
      doc.fileUrl = input.fileUrl;
      doc.originalName = input.originalName;
      doc.issuedAt = input.issuedAt;
      doc.expiresAt = input.expiresAt;
      doc.status = 'pending';
      doc.rejectionReason = null;
      doc.reviewedAt = null;
      doc.reviewedBy = null;
    } else {
      doc = this.docs.create({
        driverId,
        definitionId: input.definitionId,
        fileUrl: input.fileUrl,
        originalName: input.originalName,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        status: 'pending',
      });
    }
    await this.docs.save(doc);
    return { ok: true, id: doc.id };
  }

  async deleteDocument(
    providerId: string,
    driverId: string,
    docId: string,
  ) {
    await this.assertOwn(providerId, driverId);
    const doc = await this.docs.findOne({ where: { id: docId, driverId } });
    if (!doc) throw new NotFoundException('Belge bulunamadı');
    await this.docs.remove(doc);
    return { ok: true };
  }
}

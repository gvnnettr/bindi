import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Parent } from '@servis/db';
import { Student } from '@servis/db';
import { ServiceRequest } from '@servis/db';
import { RequestStudent } from '@servis/db';
import { School } from '@servis/db';
import { Offer } from '@servis/db';
import { OtpService } from '../otp/otp.service';
import { OTP_PURPOSE } from '@servis/shared';
import { SmsService } from '../sms/sms.service';
import { MatchingService } from './matching.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateRequestInput {
  verificationToken: string;
  parentName: string;
  parentEmail?: string;
  students: Array<{ name: string; class?: string; schoolId: string }>;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  pickupType: 'both' | 'morning_only' | 'afternoon_only';
  notes?: string;
  latitude?: number;
  longitude?: number;
}

const MAGIC_TTL_DAYS = 30;

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(ServiceRequest)
    private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(RequestStudent)
    private readonly requestStudents: Repository<RequestStudent>,
    @InjectRepository(School) private readonly schools: Repository<School>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    private readonly otp: OtpService,
    private readonly sms: SmsService,
    private readonly matching: MatchingService,
    private readonly ds: DataSource,
    private readonly notif: NotificationsService,
  ) {}

  async create(input: CreateRequestInput): Promise<{ id: string; magicToken: string }> {
    const { phone } = await this.otp.verifyToken(
      input.verificationToken,
      OTP_PURPOSE.PARENT_REQUEST,
    );
    if (input.students.length === 0)
      throw new BadRequestException('En az bir öğrenci gerekli');

    const schoolIds = Array.from(new Set(input.students.map((s) => s.schoolId)));
    const schools = await this.schools.findByIds(schoolIds);
    if (schools.length !== schoolIds.length)
      throw new BadRequestException('Geçersiz okul seçimi');

    // Mükerrer kontrolü: aynı isim + telefon kombinasyonuyla aynı okulda açık talep varsa engelle
    const existingParent = await this.parents.findOne({ where: { phone } });
    if (existingParent) {
      const openReqs = await this.requests
        .createQueryBuilder('r')
        .innerJoin('r.requestStudents', 'rs')
        .innerJoin('rs.student', 'st')
        .where('r.parent_id = :pid', { pid: existingParent.id })
        .andWhere('r.status = :status', { status: 'open' })
        .andWhere('st.school_id IN (:...schoolIds)', { schoolIds })
        .select(['st.name AS "name"'])
        .getRawMany();
      if (openReqs.length > 0) {
        const names = Array.from(new Set(openReqs.map((r) => r.name))).join(', ');
        throw new BadRequestException(
          `${names} için zaten açık bir talebiniz var. Panele giriş yapıp mevcut talebi geri çekin.`,
        );
      }
    }

    const magicToken = crypto.randomBytes(24).toString('hex');
    const magicExpiresAt = new Date(Date.now() + MAGIC_TTL_DAYS * 24 * 3600 * 1000);

    const created = await this.ds.transaction(async (m) => {
      let parent = await m.getRepository(Parent).findOne({ where: { phone } });
      if (!parent) {
        parent = m
          .getRepository(Parent)
          .create({ phone, name: input.parentName, email: input.parentEmail ?? null });
      } else {
        parent.name = input.parentName;
        parent.email = input.parentEmail ?? parent.email;
      }
      parent = await m.getRepository(Parent).save(parent);

      const studentEntities: Student[] = [];
      for (const s of input.students) {
        const entity = m.getRepository(Student).create({
          parentId: parent.id,
          name: s.name,
          class: s.class ?? null,
          schoolId: s.schoolId,
        });
        studentEntities.push(await m.getRepository(Student).save(entity));
      }

      const request = m.getRepository(ServiceRequest).create({
        parentId: parent.id,
        city: input.city,
        district: input.district,
        neighborhood: input.neighborhood,
        address: input.address,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        pickupType: input.pickupType,
        notes: input.notes ?? null,
        magicToken,
        magicExpiresAt,
        status: 'open',
      });
      const savedReq = await m.getRepository(ServiceRequest).save(request);

      for (const st of studentEntities) {
        await m.getRepository(RequestStudent).save(
          m.getRepository(RequestStudent).create({
            request: savedReq,
            student: st,
          }),
        );
      }
      return savedReq;
    });

    // Eşleşen servisçilere bildir (async, hata olursa talebi bozma)
    this.notifyMatchingProviders(
      created.id,
      schoolIds,
      input.city,
      input.district,
      input.latitude ?? null,
      input.longitude ?? null,
    ).catch(
      (e) => this.logger.error(`Notify failed: ${e.message}`),
    );

    return { id: created.id, magicToken };
  }

  private async notifyMatchingProviders(
    requestId: string,
    schoolIds: string[],
    city: string,
    district: string,
    latitude: number | null,
    longitude: number | null,
  ) {
    const providers = await this.matching.findMatchingProviders({
      schoolIds,
      city,
      district,
      latitude,
      longitude,
    });
    for (const p of providers) {
      const msg = `Yeni okul servisi talebi geldi (${city}/${district}). Panelden değerlendirin.`;
      try {
        await this.sms.send(p.phone, msg);
      } catch (e) {
        this.logger.warn(
          `SMS failed for provider ${p.id}: ${(e as Error).message}`,
        );
      }
    }
    await this.notif.createMany(
      providers.map((p) => ({
        role: 'provider' as const,
        recipientId: p.id,
        type: 'request.created',
        title: 'Yeni talep',
        body: `${city}/${district} bölgesinde yeni bir okul servisi talebi`,
        link: `/servisci/talepler/${requestId}`,
      })),
    );
    await this.notif.create({
      role: 'admin',
      type: 'request.created',
      title: 'Yeni veli talebi',
      body: `${city}/${district}`,
      link: '/admin/talepler',
    });
    this.logger.log(`Notified ${providers.length} providers for request ${requestId}`);
  }

  async getByMagicToken(token: string) {
    const request = await this.requests.findOne({
      where: { magicToken: token },
      relations: [
        'parent',
        'requestStudents',
        'requestStudents.student',
        'requestStudents.student.school',
        'offers',
        'offers.provider',
        'offers.vehicle',
      ],
    });
    if (!request) throw new NotFoundException('Talep bulunamadı');
    if (request.magicExpiresAt.getTime() < Date.now())
      throw new BadRequestException('Talep linkinin süresi dolmuş');

    // Provider rating ekle
    const providerIds = Array.from(new Set(request.offers.map((o) => o.providerId)));
    const ratings = new Map<string, { avg: number; count: number }>();
    if (providerIds.length) {
      const rows = await this.offers.manager
        .createQueryBuilder()
        .select('r.provider_id', 'providerId')
        .addSelect('AVG(r.rating)::float', 'avg')
        .addSelect('COUNT(r.id)::int', 'count')
        .from('reviews', 'r')
        .where('r.provider_id IN (:...ids)', { ids: providerIds })
        .groupBy('r.provider_id')
        .getRawMany();
      for (const row of rows) {
        ratings.set(row.providerId, { avg: Number(row.avg), count: Number(row.count) });
      }
    }
    for (const o of request.offers) {
      const p = o.provider as unknown as {
        rating: unknown;
        phone: string | null;
        companyName: string;
        ownerName: string;
      };
      p.rating = ratings.get(o.providerId) ?? null;
      if (o.status !== 'selected') {
        p.phone = null;
        p.companyName = maskName(p.companyName);
        p.ownerName = maskName(p.ownerName);
      }
    }
    return request;
  }
}

function maskName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0] + '***' : ''))
    .join(' ');
}

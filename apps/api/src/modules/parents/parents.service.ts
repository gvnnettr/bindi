import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import {
  Parent,
  ServiceRequest,
  Review,
  Provider,
  Offer,
  Student,
  RequestStudent,
  School,
  StudentGuardian,
} from '@servis/db';
import { OTP_PURPOSE, REQUEST_STATUS, PICKUP_TYPE } from '@servis/shared';
import { OtpService } from '../otp/otp.service';
import { SmsService } from '../sms/sms.service';
import * as crypto from 'crypto';
import { In, DataSource } from 'typeorm';
import { MatchingService } from '../requests/matching.service';
import { NotificationsService } from '../notifications/notifications.service';
import { haversineKm, etaMinutes } from '../../common/geo';

function maskName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0] + '***' : ''))
    .join(' ');
}

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
    @InjectRepository(ServiceRequest)
    private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(RequestStudent)
    private readonly requestStudents: Repository<RequestStudent>,
    @InjectRepository(School) private readonly schools: Repository<School>,
    @InjectRepository(StudentGuardian)
    private readonly guardians: Repository<StudentGuardian>,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    private readonly matching: MatchingService,
    private readonly ds: DataSource,
    private readonly notif: NotificationsService,
  ) {}

  async check(phone: string): Promise<{ exists: boolean; hasPassword: boolean }> {
    const normalized = phone.replace(/\D/g, '').replace(/^90/, '').replace(/^([1-9])/, '0$1');
    const parent = await this.parents.findOne({
      where: [{ phone }, { phone: normalized }],
    });
    return {
      exists: !!parent,
      hasPassword: !!parent?.passwordHash,
    };
  }

  async loginRequest(phone: string) {
    return this.otp.send(phone, OTP_PURPOSE.PARENT_LOGIN);
  }

  async loginWithOtp(phone: string, code: string, newPassword?: string) {
    await this.otp.verify(phone, OTP_PURPOSE.PARENT_LOGIN, code);
    const normalized = phone.replace(/\D/g, '').replace(/^90/, '').replace(/^([1-9])/, '0$1');
    let parent = await this.parents.findOne({
      where: [{ phone }, { phone: normalized }],
    });
    if (!parent) {
      throw new NotFoundException('Bu telefonda kayıt yok. Önce teklif talebinde bulunun.');
    }
    if (newPassword) {
      if (!/^\d{6}$/.test(newPassword))
        throw new BadRequestException('Şifre 6 rakamdan oluşmalı');
      parent.passwordHash = await argon2.hash(newPassword);
      await this.parents.save(parent);
    }
    const token = await this.jwt.signAsync({ sub: parent.id, role: 'parent' });
    return { token, parentId: parent.id, name: parent.name };
  }

  async loginWithPassword(phone: string, password: string) {
    const normalized = phone.replace(/\D/g, '').replace(/^90/, '').replace(/^([1-9])/, '0$1');
    const parent = await this.parents.findOne({
      where: [{ phone }, { phone: normalized }],
    });
    if (!parent || !parent.passwordHash)
      throw new UnauthorizedException('Telefon veya şifre hatalı');
    const ok = await argon2.verify(parent.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Telefon veya şifre hatalı');
    const token = await this.jwt.signAsync({ sub: parent.id, role: 'parent' });
    return { token, parentId: parent.id, name: parent.name };
  }

  async updateInfo(parentId: string, input: { name?: string; email?: string }) {
    const p = await this.parents.findOne({ where: { id: parentId } });
    if (!p) throw new NotFoundException();
    if (input.name !== undefined) p.name = input.name;
    if (input.email !== undefined) p.email = input.email || null;
    return this.parents.save(p);
  }

  async requestPhoneChange(parentId: string, newPhone: string) {
    const p = await this.parents.findOne({ where: { id: parentId } });
    if (!p) throw new NotFoundException();
    const normalized = newPhone
      .replace(/\D/g, '')
      .replace(/^90/, '')
      .replace(/^([1-9])/, '0$1');
    const existing = await this.parents.findOne({
      where: [{ phone: newPhone }, { phone: normalized }],
    });
    if (existing && existing.id !== parentId)
      throw new BadRequestException('Bu telefon başka bir kayıtta kullanılıyor');
    return this.otp.send(newPhone, OTP_PURPOSE.PARENT_LOGIN);
  }

  async verifyPhoneChange(parentId: string, newPhone: string, code: string) {
    await this.otp.verify(newPhone, OTP_PURPOSE.PARENT_LOGIN, code);
    const p = await this.parents.findOne({ where: { id: parentId } });
    if (!p) throw new NotFoundException();
    const normalized = newPhone
      .replace(/\D/g, '')
      .replace(/^90/, '')
      .replace(/^([1-9])/, '0$1');
    p.phone = normalized;
    await this.parents.save(p);
    return { ok: true };
  }

  async setPassword(parentId: string, password: string) {
    if (!/^\d{6}$/.test(password)) throw new BadRequestException('Şifre 6 rakamdan oluşmalı');
    const parent = await this.parents.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException();
    parent.passwordHash = await argon2.hash(password);
    await this.parents.save(parent);
    return { ok: true };
  }

  async me(parentId: string) {
    const parent = await this.parents.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException();
    return {
      id: parent.id,
      name: parent.name,
      phone: parent.phone,
      email: parent.email,
      hasPassword: !!parent.passwordHash,
    };
  }

  async listRequests(parentId: string) {
    // Kendi talepleri + guardian olduğu öğrencilerin talepleri
    const guardianStudentIds = (
      await this.guardians.find({ where: { parentId } })
    ).map((g) => g.studentId);
    const requests = await this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.requestStudents', 'rs')
      .leftJoinAndSelect('rs.student', 'st')
      .leftJoinAndSelect('st.school', 'sch')
      .leftJoinAndSelect('r.offers', 'o')
      .leftJoinAndSelect('o.provider', 'p')
      .leftJoinAndSelect('o.vehicle', 'v')
      .where('r.parent_id = :parentId', { parentId })
      .orWhere(
        guardianStudentIds.length
          ? 'st.id IN (:...guardianIds)'
          : '1 = 0',
        { guardianIds: guardianStudentIds },
      )
      .orderBy('r.created_at', 'DESC')
      .getMany();
    // Provider rating hesapla
    const providerIds = Array.from(
      new Set(requests.flatMap((r) => r.offers.map((o) => o.providerId))),
    );
    const ratings = await this.getProviderRatings(providerIds);
    return requests.map((r) => {
      const firstSchool = r.requestStudents[0]?.student?.school ?? null;
      let distanceKm: number | null = null;
      let etaMin: number | null = null;
      if (
        r.latitude != null && r.longitude != null &&
        firstSchool && firstSchool.latitude != null && firstSchool.longitude != null
      ) {
        distanceKm = Math.round(haversineKm(
          { lat: r.latitude, lng: r.longitude },
          { lat: firstSchool.latitude, lng: firstSchool.longitude },
        ) * 10) / 10;
        etaMin = etaMinutes(distanceKm);
      }
      return {
      id: r.id,
      city: r.city,
      district: r.district,
      neighborhood: r.neighborhood,
      status: r.status,
      pickupType: r.pickupType,
      createdAt: r.createdAt,
      magicToken: r.magicToken,
      distanceKm,
      etaMin,
      hasLocation: r.latitude != null && r.longitude != null,
      students: r.requestStudents.map((rs) => ({
        name: rs.student.name,
        school: rs.student.school ? rs.student.school.name : null,
      })),
      offers: r.offers.map((o) => ({
        id: o.id,
        monthlyPrice: o.monthlyPrice,
        note: o.note,
        status: o.status,
        selectedAt: o.selectedAt,
        provider: {
          id: o.provider.id,
          companyName:
            o.status === 'selected'
              ? o.provider.companyName
              : maskName(o.provider.companyName),
          ownerName:
            o.status === 'selected'
              ? o.provider.ownerName
              : maskName(o.provider.ownerName),
          phone: o.status === 'selected' ? o.provider.phone : null,
          rating: ratings.get(o.providerId) ?? null,
        },
        vehicle: o.vehicle
          ? {
              brand: o.vehicle.brand,
              model: o.vehicle.model,
              year: o.vehicle.year,
              plate: o.vehicle.plate,
              seats: o.vehicle.seats,
            }
          : null,
      })),
      };
    });
  }

  async reviewOffer(
    parentId: string,
    offerId: string,
    rating: number,
    comment?: string,
  ) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Puan 1-5 arası olmalı');
    const offer = await this.offers.findOne({
      where: { id: offerId },
      relations: ['request'],
    });
    if (!offer) throw new NotFoundException('Teklif bulunamadı');
    const owns = await this.canParentAccessRequest(parentId, offer.request.id);
    if (!owns) throw new ForbiddenException('Bu teklif size ait değil');
    if (offer.status !== 'selected')
      throw new BadRequestException('Sadece seçtiğiniz teklifi puanlayabilirsiniz');
    const existing = await this.reviews.findOne({ where: { offerId } });
    if (existing) throw new BadRequestException('Bu teklif zaten puanlanmış');
    const review = this.reviews.create({
      parentId,
      providerId: offer.providerId,
      offerId,
      rating,
      comment: comment ?? null,
    });
    await this.reviews.save(review);
    return { ok: true };
  }

  async getProviderRatings(
    providerIds: string[],
  ): Promise<Map<string, { avg: number; count: number }>> {
    const map = new Map<string, { avg: number; count: number }>();
    if (providerIds.length === 0) return map;
    const rows = await this.reviews
      .createQueryBuilder('r')
      .select('r.provider_id', 'providerId')
      .addSelect('AVG(r.rating)::float', 'avg')
      .addSelect('COUNT(r.id)::int', 'count')
      .where('r.provider_id IN (:...ids)', { ids: providerIds })
      .groupBy('r.provider_id')
      .getRawMany();
    for (const row of rows) {
      map.set(row.providerId, { avg: Number(row.avg), count: Number(row.count) });
    }
    return map;
  }

  private async canParentAccessRequest(parentId: string, requestId: string): Promise<boolean> {
    const r = await this.requests.findOne({
      where: { id: requestId },
      relations: ['requestStudents'],
    });
    if (!r) return false;
    if (r.parentId === parentId) return true;
    const studentIds = r.requestStudents.map((rs) => (rs as any).studentId ?? (rs as any).student_id);
    const g = await this.guardians.findOne({
      where: { parentId, studentId: In(studentIds) as any },
    });
    return !!g;
  }

  // === Öğrenciler ===
  async listStudents(parentId: string) {
    // Kendi tabanlı öğrenciler + guardian olarak eklenmiş öğrenciler
    const gRows = await this.guardians.find({
      where: { parentId },
      relations: ['student', 'student.school'],
    });
    const own = await this.students.find({
      where: { parentId },
      relations: ['school'],
    });
    const map = new Map<string, any>();
    for (const s of own) {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        class: s.class,
        school: s.school ? { id: s.school.id, name: s.school.name } : null,
        isPrimary: true,
        relation: 'primary',
      });
    }
    for (const g of gRows) {
      if (map.has(g.studentId)) continue;
      map.set(g.studentId, {
        id: g.student.id,
        name: g.student.name,
        class: g.student.class,
        school: g.student.school
          ? { id: g.student.school.id, name: g.student.school.name }
          : null,
        isPrimary: g.isPrimary,
        relation: g.relation,
      });
    }
    return Array.from(map.values());
  }

  async addStudent(
    parentId: string,
    input: { name: string; class?: string; schoolId: string },
  ) {
    const school = await this.schools.findOne({ where: { id: input.schoolId } });
    if (!school) throw new BadRequestException('Geçersiz okul');
    const student = this.students.create({
      parentId,
      name: input.name,
      class: input.class ?? null,
      schoolId: input.schoolId,
    });
    const saved = await this.students.save(student);
    // Kendisini primary guardian olarak da ekle
    await this.guardians.save(
      this.guardians.create({
        studentId: saved.id,
        parentId,
        relation: 'primary',
        isPrimary: true,
      }),
    );
    return saved;
  }

  async removeStudent(parentId: string, studentId: string) {
    const s = await this.students.findOne({ where: { id: studentId, parentId } });
    if (!s) throw new NotFoundException();
    await this.students.remove(s);
    return { ok: true };
  }

  // === Panelden yeni talep aç ===
  async createRequestFromPanel(
    parentId: string,
    input: {
      studentIds: string[];
      city: string;
      district: string;
      neighborhood: string;
      address: string;
      pickupType: 'both' | 'morning_only' | 'afternoon_only';
      notes?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    if (input.studentIds.length === 0)
      throw new BadRequestException('En az bir öğrenci seçin');
    const students = await this.students.find({
      where: { id: In(input.studentIds), parentId },
    });
    if (students.length !== input.studentIds.length)
      throw new BadRequestException('Bir veya birden fazla öğrenci sizin listenizde değil');
    const parent = await this.parents.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException();

    // Mükerrer kontrol: seçilen öğrencilerden birine ait açık talep varsa hata
    const openRs = await this.requestStudents
      .createQueryBuilder('rs')
      .innerJoin('rs.request', 'r')
      .innerJoin('rs.student', 'st')
      .where('rs.student_id IN (:...ids)', { ids: input.studentIds })
      .andWhere('r.status = :status', { status: 'open' })
      .select(['st.name AS "name"'])
      .getRawMany();
    if (openRs.length > 0) {
      const names = Array.from(new Set(openRs.map((r) => r.name))).join(', ');
      throw new BadRequestException(
        `${names} için zaten açık bir talebiniz var. Önce mevcut talebi geri çekin.`,
      );
    }

    const magicToken = crypto.randomBytes(24).toString('hex');
    const magicExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const schoolIds = Array.from(new Set(students.map((s) => s.schoolId!).filter(Boolean)));

    const created = await this.ds.transaction(async (m) => {
      const req = m.getRepository(ServiceRequest).create({
        parentId,
        city: input.city,
        district: input.district,
        neighborhood: input.neighborhood,
        address: input.address,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        pickupType: input.pickupType,
        notes: input.notes ?? null,
        status: 'open',
        magicToken,
        magicExpiresAt,
      });
      const savedReq = await m.getRepository(ServiceRequest).save(req);
      for (const s of students) {
        await m.getRepository(RequestStudent).save(
          m.getRepository(RequestStudent).create({ request: savedReq, student: s }),
        );
      }
      return savedReq;
    });

    // Eşleşen servisçilere SMS + bildirim + admine bildirim
    this.matching
      .findMatchingProviders({
        schoolIds,
        city: input.city,
        district: input.district,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      })
      .then(async (providers) => {
        for (const p of providers) {
          try {
            await this.sms.send(
              p.phone,
              `Yeni okul servisi talebi geldi (${input.city}/${input.district}). Panelden değerlendirin.`,
            );
          } catch {}
        }
        await this.notif.createMany(
          providers.map((p) => ({
            role: 'provider' as const,
            recipientId: p.id,
            type: 'request.created',
            title: 'Yeni talep',
            body: `${input.city}/${input.district} bölgesinde yeni bir okul servisi talebi`,
            link: `/servisci/talepler/${created.id}`,
          })),
        );
      })
      .catch(() => {});
    await this.notif.create({
      role: 'admin',
      type: 'request.created',
      title: 'Yeni veli talebi',
      body: `${parent.name} — ${input.city}/${input.district}`,
      link: `/admin/talepler`,
    });
    return { id: created.id, magicToken };
  }

  // === Talep iptal ===
  async cancelRequest(parentId: string, requestId: string) {
    const r = await this.requests.findOne({
      where: { id: requestId },
      relations: ['offers', 'parent'],
    });
    if (!r) throw new NotFoundException();
    if (r.parentId !== parentId) throw new ForbiddenException();
    if (r.status !== REQUEST_STATUS.OPEN)
      throw new BadRequestException('Sadece açık talepler iptal edilebilir');
    r.status = REQUEST_STATUS.CANCELLED as any;
    await this.requests.save(r);

    // Teklif veren servisçilere ve admine bildirim
    const providerIds = Array.from(new Set(r.offers.map((o) => o.providerId)));
    await this.notif.createMany(
      providerIds.map((pid) => ({
        role: 'provider' as const,
        recipientId: pid,
        type: 'request.cancelled',
        title: 'Veli talebini geri çekti',
        body: `${r.parent.name} tarafından açılan talep iptal edildi.`,
      })),
    );
    await this.notif.create({
      role: 'admin',
      type: 'request.cancelled',
      title: 'Talep iptal edildi',
      body: `${r.parent.name} — ${r.city}/${r.district}`,
      link: '/admin/talepler',
    });
    return { ok: true };
  }

  async unselectRequest(parentId: string, requestId: string) {
    const r = await this.requests.findOne({
      where: { id: requestId },
      relations: ['offers', 'parent'],
    });
    if (!r) throw new NotFoundException();
    if (r.parentId !== parentId) throw new ForbiddenException();
    if (r.status !== REQUEST_STATUS.CLOSED)
      throw new BadRequestException('Sadece seçim yapılmış talepler geri alınabilir');
    for (const o of r.offers) {
      if (o.status !== 'pending') {
        o.status = 'pending' as any;
        o.selectedAt = null;
      }
    }
    await this.offers.save(r.offers);
    r.status = REQUEST_STATUS.OPEN as any;
    await this.requests.save(r);
    const providerIds = Array.from(new Set(r.offers.map((o) => o.providerId)));
    await this.notif.createMany(
      providerIds.map((pid) => ({
        role: 'provider' as const,
        recipientId: pid,
        type: 'offer.reactivated',
        title: 'Teklifiniz tekrar aktif',
        body: 'Veli seçimini iptal etti. Teklifiniz hâlâ geçerli.',
        link: '/servisci/tekliflerim',
      })),
    );
    await this.notif.create({
      role: 'admin',
      type: 'offer.reactivated',
      title: 'Veli seçimini iptal etti',
      body: r.parent.name,
      link: '/admin/talepler',
    });
    return { ok: true };
  }

  // === Guardian davet ===
  async listGuardiansForParent(parentId: string) {
    // Bu velinin öğrencileri için tüm guardian'ları
    const students = await this.students.find({ where: { parentId } });
    if (students.length === 0) return [];
    const g = await this.guardians.find({
      where: { studentId: In(students.map((s) => s.id)) },
      relations: ['parent', 'student'],
    });
    return g.map((row) => ({
      id: row.id,
      relation: row.relation,
      isPrimary: row.isPrimary,
      student: { id: row.student.id, name: row.student.name },
      parent: { id: row.parent.id, name: row.parent.name, phone: row.parent.phone },
    }));
  }

  async inviteGuardian(
    inviterParentId: string,
    input: { phone: string; name: string; relation: string; studentIds: string[] },
  ) {
    if (input.studentIds.length === 0)
      throw new BadRequestException('En az bir öğrenci seçin');
    const students = await this.students.find({
      where: { id: In(input.studentIds), parentId: inviterParentId },
    });
    if (students.length !== input.studentIds.length)
      throw new BadRequestException('Öğrencilerden biri sizin listenizde değil');
    const normalized = input.phone
      .replace(/\D/g, '')
      .replace(/^90/, '')
      .replace(/^([1-9])/, '0$1');
    let target = await this.parents.findOne({
      where: [{ phone: input.phone }, { phone: normalized }],
    });
    if (!target) {
      target = this.parents.create({
        phone: normalized,
        name: input.name,
        email: null,
      });
      target = await this.parents.save(target);
    }
    if (target.id === inviterParentId)
      throw new BadRequestException('Kendinizi davet edemezsiniz');

    for (const s of students) {
      const existing = await this.guardians.findOne({
        where: { studentId: s.id, parentId: target.id },
      });
      if (existing) continue;
      await this.guardians.save(
        this.guardians.create({
          studentId: s.id,
          parentId: target.id,
          relation: input.relation,
          isPrimary: false,
        }),
      );
    }

    // Davet SMS'i
    const inviter = await this.parents.findOne({ where: { id: inviterParentId } });
    try {
      await this.sms.send(
        target.phone,
        `${inviter?.name ?? 'Bir veli'} sizi çocukları için Servis Platform'a ekledi. Giriş: https://servis.gvn.net.tr/veli/giris`,
      );
    } catch {}
    return { ok: true, invitedParentId: target.id };
  }

  async removeGuardian(parentId: string, guardianId: string) {
    const g = await this.guardians.findOne({
      where: { id: guardianId },
      relations: ['student'],
    });
    if (!g) throw new NotFoundException();
    // Sadece primary parent kaldırabilir
    if (g.student.parentId !== parentId)
      throw new ForbiddenException('Bu velinin yetkisi yok');
    if (g.isPrimary) throw new BadRequestException('Ana veli kaldırılamaz');
    await this.guardians.remove(g);
    return { ok: true };
  }
}

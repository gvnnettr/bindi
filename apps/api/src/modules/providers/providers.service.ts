import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Provider } from '@servis/db';
import { ProviderSchool } from '@servis/db';
import { ProviderRegion } from '@servis/db';
import { ProviderSubscription } from '@servis/db';
import { PackageEntity } from '@servis/db';
import { Vehicle } from '@servis/db';
import { VehicleDocument } from '@servis/db';
import { ProviderDocument, DocumentDefinition } from '@servis/db';
import { School } from '@servis/db';
import {
  PACKAGE_CODES,
  PackageCode,
  PROVIDER_STATUS,
  OTP_PURPOSE,
} from '@servis/shared';
import { OtpService } from '../otp/otp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';

export interface ProviderRegisterInput {
  verificationToken: string;
  companyName: string;
  taxNo?: string;
  ownerName: string;
  email?: string;
  address?: string;
  schoolIds: string[];
  regions: Array<{ city: string; district: string; neighborhood?: string }>;
  packages: PackageCode[]; // en az 'teklif' içermeli
  receiptUrl?: string;
  /** Yüklenen şirket belgeleri (definitionId ve dosya yolu). Servisçi kayıt akışında zorunlu belgeler kontrol edilir. */
  documents?: Array<{
    definitionId: string;
    fileUrl: string;
    originalName?: string;
    issuedAt?: string;
    expiresAt?: string;
  }>;
}

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderSchool)
    private readonly providerSchools: Repository<ProviderSchool>,
    @InjectRepository(ProviderRegion)
    private readonly providerRegions: Repository<ProviderRegion>,
    @InjectRepository(ProviderSubscription)
    private readonly subs: Repository<ProviderSubscription>,
    @InjectRepository(PackageEntity)
    private readonly packages: Repository<PackageEntity>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleDocument)
    private readonly vehicleDocs: Repository<VehicleDocument>,
    @InjectRepository(ProviderDocument)
    private readonly providerDocs: Repository<ProviderDocument>,
    @InjectRepository(DocumentDefinition)
    private readonly docDefs: Repository<DocumentDefinition>,
    @InjectRepository(School) private readonly schools: Repository<School>,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly ds: DataSource,
    private readonly notif: NotificationsService,
    private readonly sms: SmsService,
  ) {}

  async register(input: ProviderRegisterInput): Promise<{ providerId: string }> {
    const { phone } = await this.otp.verifyToken(
      input.verificationToken,
      OTP_PURPOSE.PROVIDER_REGISTER,
    );
    if (!input.packages.includes(PACKAGE_CODES.TEKLIF as PackageCode)) {
      throw new BadRequestException('Teklif paketi zorunludur');
    }
    const existing = await this.providers.findOne({ where: { phone } });
    if (
      existing &&
      existing.status === PROVIDER_STATUS.ACTIVE
    ) {
      throw new BadRequestException(
        'Bu telefon zaten aktif bir servisçi hesabı. Lütfen giriş yapın.',
      );
    }
    const schools = await this.schools.findBy({ id: In(input.schoolIds) });
    if (schools.length !== input.schoolIds.length)
      throw new BadRequestException('Geçersiz okul seçimi');

    // Zorunlu şirket belgeleri kontrol
    const requiredDefs = await this.docDefs.find({
      where: { scope: 'company' as any, required: true, active: true },
    });
    const uploadedDefIds = new Set(
      (input.documents ?? []).map((d) => d.definitionId),
    );
    const missing = requiredDefs.filter((d) => !uploadedDefIds.has(d.id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Zorunlu şirket belgeleri eksik: ${missing.map((d) => d.name).join(', ')}`,
      );
    }

    return this.ds.transaction(async (m) => {
      const providerRepo = m.getRepository(Provider);
      let provider = existing;
      if (!provider) {
        provider = providerRepo.create({ phone, status: PROVIDER_STATUS.PENDING_APPROVAL });
      }
      provider.companyName = input.companyName;
      provider.taxNo = input.taxNo ?? null;
      provider.ownerName = input.ownerName;
      provider.email = input.email ?? null;
      provider.address = input.address ?? null;
      provider.status = PROVIDER_STATUS.PENDING_APPROVAL;
      // Şifre onay sonrası admin tarafından üretilir; kayıtta null bırakılır
      provider = await providerRepo.save(provider);

      // Şirket belgelerini kaydet
      const pdocRepo = m.getRepository(ProviderDocument);
      await pdocRepo.delete({ providerId: provider.id });
      for (const doc of input.documents ?? []) {
        await pdocRepo.save(
          pdocRepo.create({
            providerId: provider.id,
            definitionId: doc.definitionId,
            fileUrl: doc.fileUrl,
            originalName: doc.originalName ?? null,
            issuedAt: doc.issuedAt ? new Date(doc.issuedAt) : null,
            expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
          }),
        );
      }

      // Reset school/region seçimlerini (kayıt tekrar olabilir)
      await m.getRepository(ProviderSchool).delete({ provider: { id: provider.id } });
      await m.getRepository(ProviderRegion).delete({ provider: { id: provider.id } });

      for (const school of schools) {
        await m.getRepository(ProviderSchool).save(
          m.getRepository(ProviderSchool).create({ provider, school }),
        );
      }
      for (const r of input.regions) {
        await m.getRepository(ProviderRegion).save(
          m.getRepository(ProviderRegion).create({
            provider,
            city: r.city,
            district: r.district,
            neighborhood: r.neighborhood ?? '*',
          }),
        );
      }

      // Bekleyen abonelik kayıtları (approvedAt=null, admin onaylayınca dolar)
      for (const code of input.packages) {
        await m.getRepository(ProviderSubscription).save(
          m.getRepository(ProviderSubscription).create({
            provider,
            providerId: provider.id,
            packageCode: code,
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // placeholder, admin ayarlar
            receiptUrl: input.receiptUrl ?? null,
          }),
        );
      }

      // Admine bildirim
      await this.notif.create({
        role: 'admin',
        type: 'provider.registered',
        title: 'Yeni servisçi başvurusu',
        body: `${provider.companyName} — onay bekliyor`,
        link: '/admin/servisciler',
      });

      // Servisçiye SMS: kaydınız alındı
      try {
        await this.sms.send(
          phone,
          `Bindi: ${provider.companyName} adına başvurunuz alındı. Belgeleriniz incelendikten sonra onay bilgisi SMS ile iletilecek.`,
        );
      } catch (e) {
        this.logger.warn(`Provider register SMS failed: ${(e as Error).message}`);
      }
      return { providerId: provider.id };
    });
  }

  async notifyRegistration(providerId: string, companyName: string) {
    await this.notif.create({
      role: 'admin',
      type: 'provider.registered',
      title: 'Yeni servisçi başvurusu',
      body: `${companyName} — onay bekliyor`,
      link: '/admin/servisciler',
    });
  }

  async login(phone: string, password: string) {
    // Telefon normalizasyonu OtpService içinde vardı; burada da benzer normalize
    const normalized = phone
      .replace(/\D/g, '')
      .replace(/^90/, '')
      .replace(/^([1-9])/, '0$1');
    const provider = await this.providers.findOne({
      where: [{ phone }, { phone: normalized }],
    });
    if (!provider) throw new UnauthorizedException('Telefon veya şifre hatalı');
    if (!provider.passwordHash)
      throw new UnauthorizedException('Şifre belirlenmemiş. Kayıt tamamlanmamış olabilir.');
    const ok = await argon2.verify(provider.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Telefon veya şifre hatalı');
    // Askıya alınmış hesaplar hariç, tüm durumlarda giriş açık.
    // pending_approval / pending_payment olanlar belge veya ödeme
    // tamamlaması için panele erişebilir.
    if (provider.status === PROVIDER_STATUS.SUSPENDED)
      throw new UnauthorizedException('Hesap askıya alınmış.');
    const token = await this.jwt.signAsync({
      sub: provider.id,
      role: 'provider',
    });
    return {
      token,
      providerId: provider.id,
      mustChangePassword: !!provider.mustChangePassword,
    };
  }

  async forgotPassword(phone: string) {
    const normalized = phone.replace(/\D/g, '').replace(/^90/, '').replace(/^([1-9])/, '0$1');
    const provider = await this.providers.findOne({
      where: [{ phone }, { phone: normalized }],
    });
    if (!provider) throw new NotFoundException('Bu telefonda kayıt yok');
    return this.otp.send(phone, OTP_PURPOSE.PROVIDER_FORGOT);
  }

  async resetPassword(phone: string, code: string, newPassword: string) {
    if (!/^\d{6}$/.test(newPassword)) throw new BadRequestException('Şifre 6 rakamdan oluşmalı');
    await this.otp.verify(phone, OTP_PURPOSE.PROVIDER_FORGOT, code);
    const normalized = phone.replace(/\D/g, '').replace(/^90/, '').replace(/^([1-9])/, '0$1');
    const provider = await this.providers.findOne({
      where: [{ phone }, { phone: normalized }],
    });
    if (!provider) throw new NotFoundException();
    provider.passwordHash = await argon2.hash(newPassword);
    await this.providers.save(provider);
    return { ok: true };
  }

  async changePassword(providerId: string, currentPassword: string, newPassword: string) {
    if (!/^\d{6}$/.test(newPassword)) throw new BadRequestException('Şifre 6 rakamdan oluşmalı');
    const p = await this.providers.findOne({ where: { id: providerId } });
    if (!p || !p.passwordHash) throw new UnauthorizedException();
    const ok = await argon2.verify(p.passwordHash, currentPassword);
    if (!ok) throw new UnauthorizedException('Mevcut şifre hatalı');
    p.passwordHash = await argon2.hash(newPassword);
    p.mustChangePassword = false;
    await this.providers.save(p);
    return { ok: true };
  }

  async updateInfo(
    providerId: string,
    input: Partial<{
      companyName: string;
      taxNo: string;
      ownerName: string;
      email: string;
      address: string;
    }>,
  ) {
    const p = await this.providers.findOne({ where: { id: providerId } });
    if (!p) throw new NotFoundException();
    if (input.companyName !== undefined) p.companyName = input.companyName;
    if (input.taxNo !== undefined) p.taxNo = input.taxNo || null;
    if (input.ownerName !== undefined) p.ownerName = input.ownerName;
    if (input.email !== undefined) p.email = input.email || null;
    if (input.address !== undefined) p.address = input.address || null;
    return this.providers.save(p);
  }

  async listMySchools(providerId: string) {
    const rows = await this.providerSchools.find({
      where: { provider: { id: providerId } },
      relations: ['school'],
    });
    return rows.map((r) => ({
      id: r.id,
      school: { id: r.school.id, name: r.school.name, city: r.school.city, district: r.school.district },
    }));
  }

  async addMySchool(providerId: string, schoolId: string) {
    const school = await this.schools.findOne({ where: { id: schoolId } });
    if (!school) throw new BadRequestException('Okul bulunamadı');
    const existing = await this.providerSchools.findOne({
      where: { provider: { id: providerId }, school: { id: schoolId } },
    });
    if (existing) throw new BadRequestException('Bu okul zaten eklenmiş');
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException();
    const row = this.providerSchools.create({ provider, school });
    return this.providerSchools.save(row);
  }

  async removeMySchool(providerId: string, id: string) {
    const row = await this.providerSchools.findOne({
      where: { id, provider: { id: providerId } },
    });
    if (!row) throw new NotFoundException();
    await this.providerSchools.remove(row);
    return { ok: true };
  }

  async listMyRegions(providerId: string) {
    return this.providerRegions.find({ where: { provider: { id: providerId } } });
  }

  async addMyRegion(providerId: string, city: string, district: string) {
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException();
    const existing = await this.providerRegions.findOne({
      where: { provider: { id: providerId }, city, district },
    });
    if (existing) throw new BadRequestException('Bu bölge zaten eklenmiş');
    return this.providerRegions.save(
      this.providerRegions.create({ provider, city, district, neighborhood: '*' }),
    );
  }

  async addMyLocationRegion(
    providerId: string,
    input: { label: string; latitude: number; longitude: number; radiusKm: number },
  ) {
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException();
    return this.providerRegions.save(
      this.providerRegions.create({
        provider,
        city: '*',
        district: '*',
        neighborhood: input.label.slice(0, 120),
        label: input.label,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusKm: input.radiusKm,
      }),
    );
  }

  async removeMyRegion(providerId: string, id: string) {
    const row = await this.providerRegions.findOne({
      where: { id, provider: { id: providerId } },
    });
    if (!row) throw new NotFoundException();
    await this.providerRegions.remove(row);
    return { ok: true };
  }

  async hasActiveTeklifSubscription(providerId: string): Promise<boolean> {
    const count = await this.subs.count({
      where: {
        providerId,
        packageCode: PACKAGE_CODES.TEKLIF,
        endsAt: MoreThan(new Date()),
      },
    });
    return count > 0;
  }

  async hasActiveTakipSubscription(providerId: string): Promise<boolean> {
    const rows = await this.subs.find({
      where: {
        providerId,
        packageCode: PACKAGE_CODES.TAKIP,
      },
    });
    const now = new Date();
    return rows.some(
      (s) => s.approvedAt && s.endsAt && new Date(s.endsAt) > now,
    );
  }

  async requestTakipSubscription(providerId: string) {
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Servisçi bulunamadı');
    await this.notif.create({
      role: 'admin',
      type: 'takip.interest',
      title: 'Takip Paketi ilgisi',
      body: `${provider.companyName} Takip Paketi'ne ilgisini bildirdi.`,
      link: `/admin/servisciler/${provider.id}`,
    });
    return { ok: true };
  }

  async getDashboard(providerId: string) {
    const [pendingRows, wonRows, ratingRows, newReqRows] = await Promise.all([
      this.ds.query(
        `SELECT COUNT(*)::int AS c FROM offers WHERE provider_id = $1 AND status = 'pending'`,
        [providerId],
      ),
      this.ds.query(
        `SELECT COUNT(*)::int AS c,
                COALESCE(SUM(monthly_price), 0)::numeric AS revenue
         FROM offers
         WHERE provider_id = $1 AND status = 'selected'`,
        [providerId],
      ),
      this.ds.query(
        `SELECT COALESCE(AVG(rating), 0)::float AS avg,
                COUNT(*)::int AS c
         FROM reviews WHERE provider_id = $1`,
        [providerId],
      ),
      this.ds.query(
        `SELECT COUNT(*)::int AS c
         FROM service_requests sr
         WHERE sr.created_at >= NOW() - INTERVAL '24 hours'
           AND sr.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM offers o
             WHERE o.request_id = sr.id AND o.provider_id = $1
           )`,
        [providerId],
      ),
    ]);

    return {
      pendingOffers: pendingRows[0]?.c ?? 0,
      wonOffers: wonRows[0]?.c ?? 0,
      activeMonthlyRevenue: Number(wonRows[0]?.revenue ?? 0),
      avgRating: Number(ratingRows[0]?.avg ?? 0),
      totalReviews: ratingRows[0]?.c ?? 0,
      newRequestsToday: newReqRows[0]?.c ?? 0,
    };
  }

  async getEarningsReport(providerId: string) {
    const monthlyRows = await this.ds.query(
      `SELECT
         to_char(date_trunc('month', p.paid_at), 'YYYY-MM') AS period,
         COALESCE(SUM(p.amount), 0)::numeric AS revenue,
         COUNT(*)::int AS payment_count
       FROM payments p
       JOIN enrollments e ON e.id = p.enrollment_id
       WHERE e.provider_id = $1
         AND p.status = 'paid'
         AND p.paid_at IS NOT NULL
         AND p.paid_at >= NOW() - INTERVAL '12 months'
       GROUP BY date_trunc('month', p.paid_at)
       ORDER BY date_trunc('month', p.paid_at) ASC`,
      [providerId],
    );

    const [totals] = await this.ds.query(
      `SELECT
         COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0)::numeric AS total_paid,
         COALESCE(SUM(CASE WHEN p.status IN ('pending', 'submitted', 'late') THEN p.amount ELSE 0 END), 0)::numeric AS pending_amount,
         COUNT(*) FILTER (WHERE p.status = 'paid')::int AS paid_count,
         COUNT(*) FILTER (WHERE p.status IN ('pending', 'late'))::int AS unpaid_count
       FROM payments p
       JOIN enrollments e ON e.id = p.enrollment_id
       WHERE e.provider_id = $1`,
      [providerId],
    );

    return {
      monthly: monthlyRows.map((r: any) => ({
        period: r.period,
        revenue: Number(r.revenue),
        paymentCount: Number(r.payment_count),
      })),
      totalPaid: Number(totals?.total_paid ?? 0),
      pendingAmount: Number(totals?.pending_amount ?? 0),
      paidCount: Number(totals?.paid_count ?? 0),
      unpaidCount: Number(totals?.unpaid_count ?? 0),
    };
  }

  /**
   * Public reviews — veli teklif detay ekranı için.
   * KVKK: veli ismi 'A.Y.' baş harf maskesi. Son 10 yorum.
   */
  async getPublicReviews(providerId: string): Promise<{
    avg: number;
    total: number;
    reviews: Array<{ rating: number; comment: string | null; createdAt: Date; parentInitials: string }>;
  }> {
    const [avgRow, recentRows] = await Promise.all([
      this.ds.query(
        `SELECT COALESCE(AVG(rating), 0)::float AS avg,
                COUNT(*)::int AS c
         FROM reviews WHERE provider_id = $1`,
        [providerId],
      ),
      this.ds.query(
        `SELECT r.rating, r.comment, r.created_at,
                COALESCE(p.name, 'Anonim') AS parent_name
         FROM reviews r
         LEFT JOIN parents p ON r.parent_id = p.id
         WHERE r.provider_id = $1
         ORDER BY r.created_at DESC
         LIMIT 10`,
        [providerId],
      ),
    ]);
    return {
      avg: Number(avgRow[0]?.avg ?? 0),
      total: avgRow[0]?.c ?? 0,
      reviews: recentRows.map((row: any) => ({
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
        parentInitials: String(row.parent_name || 'A')
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((w: string) => w[0].toUpperCase() + '.')
          .join(''),
      })),
    };
  }

  async getReviewsStats(providerId: string) {
    const [avgRow, distRows, recentRows] = await Promise.all([
      this.ds.query(
        `SELECT COALESCE(AVG(rating), 0)::float AS avg,
                COUNT(*)::int AS c
         FROM reviews WHERE provider_id = $1`,
        [providerId],
      ),
      this.ds.query(
        `SELECT rating, COUNT(*)::int AS c
         FROM reviews WHERE provider_id = $1
         GROUP BY rating
         ORDER BY rating DESC`,
        [providerId],
      ),
      this.ds.query(
        `SELECT r.rating, r.comment, r.created_at,
                COALESCE(p.name, 'Anonim') AS parent_name
         FROM reviews r
         LEFT JOIN parents p ON r.parent_id = p.id
         WHERE r.provider_id = $1
         ORDER BY r.created_at DESC
         LIMIT 10`,
        [providerId],
      ),
    ]);

    const distribution: Array<{ rating: number; count: number }> = [];
    for (let r = 5; r >= 1; r--) {
      const found = distRows.find((row: any) => Number(row.rating) === r);
      distribution.push({ rating: r, count: found?.c ?? 0 });
    }

    return {
      avg: Number(avgRow[0]?.avg ?? 0),
      total: avgRow[0]?.c ?? 0,
      distribution,
      recent: recentRows.map((row: any) => ({
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
        parentName: row.parent_name,
      })),
    };
  }

  async getById(providerId: string) {
    // Provider'a bakmadan önce zorunlu belgeler tam onaylı ise otomatik aktifleştir.
    // Auto-activate önceki yerlerde tetiklenmediyse burada yakalanır.
    await this.maybeAutoActivate(providerId);
    const provider = await this.providers.findOne({
      where: { id: providerId },
      relations: [
        'providerSchools',
        'providerSchools.school',
        'providerRegions',
        'subscriptions',
        'vehicles',
      ],
    });
    if (!provider) throw new NotFoundException('Servisçi bulunamadı');
    return provider;
  }

  private async maybeAutoActivate(providerId: string) {
    const provider = await this.providers.findOne({
      where: { id: providerId },
      relations: ['subscriptions'],
    });
    if (!provider) return;
    if (provider.status !== PROVIDER_STATUS.PENDING_APPROVAL) return;

    const requiredDefs = await this.docDefs.find({
      where: { scope: 'company' as any, required: true, active: true },
    });
    if (requiredDefs.length === 0) return;
    const docs = await this.providerDocs.find({ where: { providerId } });
    const byDef = new Map(docs.map((d) => [d.definitionId, d]));
    const allApproved = requiredDefs.every(
      (def) => byDef.get(def.id)?.status === 'approved',
    );
    if (!allApproved) return;

    const now = new Date();
    const endsAt = new Date(now.getTime() + 12 * 30 * 24 * 3600 * 1000);
    for (const sub of provider.subscriptions ?? []) {
      if (!sub.approvedAt) {
        sub.startsAt = now;
        sub.endsAt = endsAt;
        sub.approvedAt = now;
        await this.subs.save(sub);
      }
    }

    let generatedPassword: string | null = null;
    if (!provider.passwordHash) {
      generatedPassword = generateSimplePassword();
      provider.passwordHash = await argon2.hash(generatedPassword);
      provider.mustChangePassword = true;
    }
    provider.status = PROVIDER_STATUS.ACTIVE;
    await this.providers.save(provider);

    try {
      await this.notif.create({
        role: 'provider',
        recipientId: provider.id,
        type: 'provider.approved',
        title: 'Hesabınız aktifleşti 🎉',
        body: 'Tüm belgeleriniz onaylandı. Talepleri görüntüleyip teklif verebilirsiniz.',
        link: '/servisci',
      });
    } catch {}

    try {
      if (generatedPassword) {
        await this.sms.send(
          provider.phone,
          `Bindi: ${provider.companyName} tüm belgeleriniz onaylandı, hesabınız aktif! Giriş: bindi.com.tr/servisci/giris Telefon: ${provider.phone} Şifre: ${generatedPassword}`,
        );
      } else {
        await this.sms.send(
          provider.phone,
          `Bindi: Tüm belgeleriniz onaylandı, hesabınız aktif. bindi.com.tr/servisci/giris`,
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Auto-activate SMS]', (e as Error).message);
    }
  }

  async addVehicle(providerId: string, v: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    seats: number;
    photoUrl?: string;
  }) {
    const vehicle = this.vehicles.create({ providerId, ...v, photoUrl: v.photoUrl ?? null });
    return this.vehicles.save(vehicle);
  }

  async listVehicles(providerId: string) {
    return this.vehicles.find({ where: { providerId } });
  }

  async updateVehicle(
    providerId: string,
    id: string,
    input: Partial<{
      brand: string;
      model: string;
      year: number;
      plate: string;
      seats: number;
      photoUrl: string | null;
    }>,
  ) {
    const v = await this.vehicles.findOne({ where: { id, providerId } });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    Object.assign(v, input);
    return this.vehicles.save(v);
  }

  async deleteVehicle(providerId: string, id: string) {
    const v = await this.vehicles.findOne({ where: { id, providerId } });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    try {
      await this.vehicles.remove(v);
      return { ok: true };
    } catch (e) {
      throw new BadRequestException(
        'Bu araç kabul edilen bir tekliftedir, silinemez. Önce teklifi sonlandırın.',
      );
    }
  }

  private async assertOwnVehicle(providerId: string, vehicleId: string) {
    const v = await this.vehicles.findOne({ where: { id: vehicleId, providerId } });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    return v;
  }

  async listVehicleDocuments(providerId: string, vehicleId: string) {
    await this.assertOwnVehicle(providerId, vehicleId);
    // Admin tanımlarını çek, her belge tanımı için mevcut yüklemeyi hizala
    const defs = await this.docDefs.find({
      where: { scope: 'vehicle' as any, active: true },
      order: { sortOrder: 'ASC' },
    });
    const uploaded = await this.vehicleDocs.find({
      where: { vehicleId },
      order: { createdAt: 'DESC' },
    });
    const byDef = new Map<string, VehicleDocument>();
    for (const d of uploaded) {
      if (d.definitionId && !byDef.has(d.definitionId)) byDef.set(d.definitionId, d);
    }
    const now = new Date();
    const buildDocView = (d: VehicleDocument) => {
      let expiryStatus: 'ok' | 'soon' | 'expired' | 'na' = 'na';
      let daysToExpiry: number | null = null;
      if (d.expiresAt) {
        const ms = new Date(d.expiresAt).getTime() - now.getTime();
        daysToExpiry = Math.ceil(ms / 86400000);
        expiryStatus =
          daysToExpiry < 0 ? 'expired' : daysToExpiry <= 30 ? 'soon' : 'ok';
      }
      return {
        id: d.id,
        vehicleId: d.vehicleId,
        definitionId: d.definitionId,
        fileUrl: d.fileUrl,
        originalName: d.originalName,
        issuedAt: d.issuedAt,
        expiresAt: d.expiresAt,
        note: d.note,
        status: d.status,
        rejectionReason: d.rejectionReason,
        createdAt: d.createdAt,
        daysToExpiry,
        expiryStatus,
      };
    };
    return defs.map((def) => {
      const d = byDef.get(def.id);
      return {
        definition: {
          id: def.id,
          code: def.code,
          name: def.name,
          required: def.required,
          requiresExpiry: def.requiresExpiry,
          description: def.description,
        },
        document: d ? buildDocView(d) : null,
      };
    });
  }

  async addVehicleDocument(
    providerId: string,
    vehicleId: string,
    input: {
      definitionId: string;
      fileUrl: string;
      originalName: string;
      issuedAt: Date | null;
      expiresAt: Date | null;
      note?: string | null;
    },
  ) {
    await this.assertOwnVehicle(providerId, vehicleId);
    const def = await this.docDefs.findOne({ where: { id: input.definitionId } });
    if (!def) throw new NotFoundException('Belge tanımı bulunamadı');
    let doc = await this.vehicleDocs.findOne({
      where: { vehicleId, definitionId: input.definitionId },
    });
    if (doc) {
      doc.fileUrl = input.fileUrl;
      doc.originalName = input.originalName;
      doc.issuedAt = input.issuedAt;
      doc.expiresAt = input.expiresAt;
      doc.note = input.note ?? null;
      doc.status = 'pending';
      doc.rejectionReason = null;
      doc.reviewedAt = null;
      doc.reviewedBy = null;
    } else {
      doc = this.vehicleDocs.create({
        vehicleId,
        definitionId: input.definitionId,
        fileUrl: input.fileUrl,
        originalName: input.originalName,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        note: input.note ?? null,
        status: 'pending',
      });
    }
    await this.vehicleDocs.save(doc);
    return { ok: true, id: doc.id, fileUrl: doc.fileUrl };
  }

  async deleteVehicleDocument(
    providerId: string,
    vehicleId: string,
    docId: string,
  ) {
    await this.assertOwnVehicle(providerId, vehicleId);
    const doc = await this.vehicleDocs.findOne({
      where: { id: docId, vehicleId },
    });
    if (!doc) throw new NotFoundException('Belge bulunamadı');
    await this.vehicleDocs.remove(doc);
    return { ok: true };
  }

  async listMyCompanyDocuments(providerId: string) {
    const definitions = await this.docDefs.find({
      where: { scope: 'company' as any, active: true },
      order: { sortOrder: 'ASC' },
    });
    const docs = await this.providerDocs.find({ where: { providerId } });
    const byDef = new Map(docs.map((d) => [d.definitionId, d]));
    return definitions.map((def) => ({
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
    }));
  }

  async upsertCompanyDocument(
    providerId: string,
    input: {
      definitionId: string;
      fileUrl: string;
      originalName: string;
      issuedAt: Date | null;
      expiresAt: Date | null;
    },
  ) {
    const def = await this.docDefs.findOne({
      where: { id: input.definitionId },
    });
    if (!def) throw new NotFoundException('Belge tanımı bulunamadı');
    let doc = await this.providerDocs.findOne({
      where: { providerId, definitionId: input.definitionId },
    });
    if (doc) {
      // Reddedilmiş veya beklemedeyken tekrar yükleme — status'ü pending'e döndür
      doc.fileUrl = input.fileUrl;
      doc.originalName = input.originalName;
      doc.issuedAt = input.issuedAt;
      doc.expiresAt = input.expiresAt;
      doc.status = 'pending';
      doc.rejectionReason = null;
      doc.reviewedAt = null;
      doc.reviewedBy = null;
    } else {
      doc = this.providerDocs.create({
        providerId,
        definitionId: input.definitionId,
        fileUrl: input.fileUrl,
        originalName: input.originalName,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        status: 'pending',
      });
    }
    await this.providerDocs.save(doc);
    return { ok: true, id: doc.id };
  }
}

function generateSimplePassword(): string {
  let out = String(1 + Math.floor(Math.random() * 9));
  for (let i = 0; i < 5; i++) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

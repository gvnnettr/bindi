import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Between, MoreThan, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import {
  AdminUser,
  Provider,
  ProviderSubscription,
  School,
  PackageEntity,
  ServiceRequest,
  Offer,
  Parent,
  Review,
  ProviderDocument,
  DocumentDefinition,
  ProviderSchool,
  ProviderRegion,
  Vehicle,
  VehicleDocument,
  Driver,
  DriverDocument,
  AdminActivityLog,
} from '@servis/db';
import { PROVIDER_STATUS } from '@servis/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser) private readonly users: Repository<AdminUser>,
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderSubscription)
    private readonly subs: Repository<ProviderSubscription>,
    @InjectRepository(School) private readonly schools: Repository<School>,
    @InjectRepository(PackageEntity)
    private readonly packages: Repository<PackageEntity>,
    @InjectRepository(ServiceRequest)
    private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(ProviderDocument)
    private readonly providerDocs: Repository<ProviderDocument>,
    @InjectRepository(DocumentDefinition)
    private readonly docDefs: Repository<DocumentDefinition>,
    @InjectRepository(ProviderSchool)
    private readonly providerSchools: Repository<ProviderSchool>,
    @InjectRepository(ProviderRegion)
    private readonly providerRegions: Repository<ProviderRegion>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleDocument)
    private readonly vehicleDocs: Repository<VehicleDocument>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(DriverDocument)
    private readonly driverDocs: Repository<DriverDocument>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLog: Repository<AdminActivityLog>,
    private readonly jwt: JwtService,
    private readonly notif: NotificationsService,
    private readonly sms: SmsService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Kimlik doğrulama başarısız');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Kimlik doğrulama başarısız');
    const token = await this.jwt.signAsync({ sub: user.id, role: 'admin' });
    return { token, email: user.email };
  }

  async listAdmins() {
    const rows = await this.users.find({ order: { createdAt: 'ASC' } });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  async createAdmin(input: { email: string; password: string; role?: string }) {
    const existing = await this.users.findOne({ where: { email: input.email } });
    if (existing) throw new BadRequestException('Bu e-posta zaten kayıtlı');
    const passwordHash = await argon2.hash(input.password);
    const user = this.users.create({
      email: input.email,
      passwordHash,
      role: (input.role as any) ?? 'admin',
    });
    await this.users.save(user);
    return { id: user.id, email: user.email, role: user.role };
  }

  async updateAdmin(
    id: string,
    input: { email?: string; password?: string; role?: string },
  ) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    if (input.email && input.email !== user.email) {
      const existing = await this.users.findOne({ where: { email: input.email } });
      if (existing) throw new BadRequestException('Bu e-posta zaten kayıtlı');
      user.email = input.email;
    }
    if (input.password) {
      user.passwordHash = await argon2.hash(input.password);
    }
    if (input.role) user.role = input.role as any;
    await this.users.save(user);
    return { id: user.id, email: user.email, role: user.role };
  }

  async deleteAdmin(id: string, currentUserId: string) {
    if (id === currentUserId)
      throw new BadRequestException('Kendi hesabınızı silemezsiniz');
    const count = await this.users.count();
    if (count <= 1) throw new BadRequestException('Son admin silinemez');
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    await this.users.remove(user);
    return { ok: true };
  }

  async providerDetail(providerId: string) {
    const p = await this.providers.findOne({
      where: { id: providerId },
      relations: [
        'providerSchools',
        'providerSchools.school',
        'providerRegions',
        'subscriptions',
        'vehicles',
      ],
    });
    if (!p) throw new NotFoundException();

    const offers = await this.offers.find({
      where: { providerId },
      relations: ['request', 'request.parent'],
      order: { createdAt: 'DESC' },
      take: 30,
    });
    const ratings = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.rating)::float', 'avg')
      .addSelect('COUNT(*)::int', 'count')
      .where('r.provider_id = :pid', { pid: providerId })
      .getRawOne();
    const wonCount = await this.offers.count({
      where: { providerId, status: 'selected' as any },
    });
    const wonTotal = await this.offers
      .createQueryBuilder('o')
      .select('SUM(o.monthly_price)::float', 'sum')
      .where('o.provider_id = :pid AND o.status = :s', { pid: providerId, s: 'selected' })
      .getRawOne();

    return {
      id: p.id,
      companyName: p.companyName,
      taxNo: p.taxNo,
      ownerName: p.ownerName,
      email: p.email,
      phone: p.phone,
      address: p.address,
      status: p.status,
      createdAt: p.createdAt,
      schools: p.providerSchools.map((ps) => ({
        id: ps.id,
        school: {
          id: ps.school.id,
          name: ps.school.name,
          city: ps.school.city,
          district: ps.school.district,
        },
      })),
      regions: p.providerRegions.map((r) => ({
        id: r.id,
        city: r.city,
        district: r.district,
        latitude: r.latitude,
        longitude: r.longitude,
        radiusKm: r.radiusKm,
        label: r.label,
      })),
      subscriptions: p.subscriptions.map((s) => ({
        id: s.id,
        packageCode: s.packageCode,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        approvedAt: s.approvedAt,
        receiptUrl: s.receiptUrl,
      })),
      vehicles: p.vehicles.map((v) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        plate: v.plate,
        seats: v.seats,
      })),
      offers: offers.map((o) => ({
        id: o.id,
        monthlyPrice: o.monthlyPrice,
        status: o.status,
        createdAt: o.createdAt,
        selectedAt: o.selectedAt,
        request: {
          id: o.request.id,
          city: o.request.city,
          district: o.request.district,
          neighborhood: o.request.neighborhood,
          parentName: o.request.parent?.name,
        },
      })),
      stats: {
        wonCount,
        wonTotal: Number(wonTotal?.sum ?? 0),
        offerCount: offers.length,
        ratingAvg: Number(ratings?.avg ?? 0),
        ratingCount: Number(ratings?.count ?? 0),
      },
    };
  }

  async listProviderDocuments(providerId: string) {
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Servisçi bulunamadı');
    const definitions = await this.docDefs.find({
      where: { scope: 'company' as any, active: true },
      order: { sortOrder: 'ASC' },
    });
    const docs = await this.providerDocs.find({
      where: { providerId },
    });
    const byDef = new Map(docs.map((d) => [d.definitionId, d]));
    const now = new Date();
    return definitions.map((def) => {
      const doc = byDef.get(def.id);
      let expiryStatus: 'ok' | 'soon' | 'expired' | 'na' = 'na';
      let daysToExpiry: number | null = null;
      if (doc?.expiresAt) {
        const ms = new Date(doc.expiresAt).getTime() - now.getTime();
        daysToExpiry = Math.ceil(ms / 86400000);
        expiryStatus =
          daysToExpiry < 0 ? 'expired' : daysToExpiry <= 30 ? 'soon' : 'ok';
      }
      return {
        definition: {
          id: def.id,
          code: def.code,
          name: def.name,
          required: def.required,
          requiresExpiry: def.requiresExpiry,
          description: def.description,
        },
        document: doc
          ? {
              id: doc.id,
              fileUrl: doc.fileUrl,
              originalName: doc.originalName,
              issuedAt: doc.issuedAt,
              expiresAt: doc.expiresAt,
              status: doc.status,
              rejectionReason: doc.rejectionReason,
              reviewedAt: doc.reviewedAt,
              createdAt: doc.createdAt,
              daysToExpiry,
              expiryStatus,
            }
          : null,
      };
    });
  }

  async listExpiringDocuments(daysAhead = 30) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const limit = new Date(now.getTime() + daysAhead * 86400000);

    const [companyDocs, vehicleDocs, driverDocs] = await Promise.all([
      this.providerDocs
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.provider', 'provider')
        .leftJoinAndSelect('d.definition', 'def')
        .where('d.expires_at IS NOT NULL')
        .andWhere('d.expires_at <= :limit', { limit })
        .orderBy('d.expires_at', 'ASC')
        .getMany(),
      this.vehicleDocs
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.vehicle', 'vehicle')
        .leftJoinAndSelect('vehicle.provider', 'provider')
        .leftJoinAndSelect('d.definition', 'def')
        .where('d.expires_at IS NOT NULL')
        .andWhere('d.expires_at <= :limit', { limit })
        .orderBy('d.expires_at', 'ASC')
        .getMany(),
      this.driverDocs
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.driver', 'driver')
        .leftJoinAndSelect('driver.provider', 'provider')
        .leftJoinAndSelect('d.definition', 'def')
        .where('d.expires_at IS NOT NULL')
        .andWhere('d.expires_at <= :limit', { limit })
        .orderBy('d.expires_at', 'ASC')
        .getMany(),
    ]);

    const view = (scope: 'company' | 'vehicle' | 'driver', docs: any[]) =>
      docs.map((d: any) => {
        const daysLeft = Math.ceil(
          (new Date(d.expiresAt).getTime() - now.getTime()) / 86400000,
        );
        const provider =
          scope === 'company'
            ? d.provider
            : scope === 'vehicle'
              ? d.vehicle?.provider
              : d.driver?.provider;
        const owner =
          scope === 'vehicle'
            ? `${d.vehicle?.plate ?? ''} — ${d.vehicle?.brand ?? ''} ${d.vehicle?.model ?? ''}`.trim()
            : scope === 'driver'
              ? (d.driver?.name ?? '')
              : '';
        return {
          id: d.id,
          scope,
          documentName: d.definition?.name ?? d.type ?? 'Belge',
          expiresAt: d.expiresAt,
          daysLeft,
          expired: daysLeft < 0,
          provider: provider
            ? {
                id: provider.id,
                companyName: provider.companyName,
                phone: provider.phone,
              }
            : null,
          owner,
        };
      });

    return [
      ...view('company', companyDocs),
      ...view('vehicle', vehicleDocs),
      ...view('driver', driverDocs),
    ].sort((a, b) => a.daysLeft - b.daysLeft);
  }

  async listProviderVehicleDocuments(providerId: string) {
    const vehicles = await this.vehicles.find({
      where: { providerId },
      order: { id: 'ASC' },
    });
    const defs = await this.docDefs.find({
      where: { scope: 'vehicle' as any, active: true },
      order: { sortOrder: 'ASC' },
    });
    const results = [];
    for (const v of vehicles) {
      const uploaded = await this.vehicleDocs.find({
        where: { vehicleId: v.id },
      });
      const byDef = new Map(
        uploaded.filter((d) => d.definitionId).map((d) => [d.definitionId!, d]),
      );
      results.push({
        vehicle: {
          id: v.id,
          brand: v.brand,
          model: v.model,
          year: v.year,
          plate: v.plate,
          seats: v.seats,
        },
        documents: defs.map((def) => {
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
            document: d
              ? {
                  id: d.id,
                  fileUrl: d.fileUrl,
                  originalName: d.originalName,
                  issuedAt: d.issuedAt,
                  expiresAt: d.expiresAt,
                  status: d.status,
                  rejectionReason: d.rejectionReason,
                  reviewedAt: d.reviewedAt,
                  createdAt: d.createdAt,
                }
              : null,
          };
        }),
      });
    }
    return results;
  }

  async listProviderDrivers(providerId: string) {
    const drivers = await this.drivers.find({
      where: { providerId },
      order: { createdAt: 'ASC' },
    });
    const defs = await this.docDefs.find({
      where: { scope: 'driver' as any, active: true },
      order: { sortOrder: 'ASC' },
    });
    const results = [];
    for (const dr of drivers) {
      const uploaded = await this.driverDocs.find({
        where: { driverId: dr.id },
      });
      const byDef = new Map(uploaded.map((d) => [d.definitionId, d]));
      results.push({
        driver: {
          id: dr.id,
          name: dr.name,
          phone: dr.phone,
          tcNo: dr.tcNo,
          licenseClass: dr.licenseClass,
          active: dr.active,
        },
        documents: defs.map((def) => {
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
            document: d
              ? {
                  id: d.id,
                  fileUrl: d.fileUrl,
                  originalName: d.originalName,
                  issuedAt: d.issuedAt,
                  expiresAt: d.expiresAt,
                  status: d.status,
                  rejectionReason: d.rejectionReason,
                  reviewedAt: d.reviewedAt,
                  createdAt: d.createdAt,
                }
              : null,
          };
        }),
      });
    }
    return results;
  }

  async reviewVehicleDocument(
    docId: string,
    decision: 'approved' | 'rejected',
    rejectionReason: string | null,
    adminId: string,
  ) {
    const doc = await this.vehicleDocs.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Belge bulunamadı');
    if (decision === 'rejected' && !rejectionReason?.trim())
      throw new BadRequestException('Red gerekçesi zorunlu');
    doc.status = decision;
    doc.rejectionReason = decision === 'rejected' ? rejectionReason : null;
    doc.reviewedAt = new Date();
    doc.reviewedBy = adminId;
    await this.vehicleDocs.save(doc);

    const vehicle = await this.vehicles.findOne({ where: { id: doc.vehicleId } });
    if (vehicle) {
      const def = await this.docDefs.findOne({
        where: { id: doc.definitionId ?? '' },
      });
      const docName = def?.name ?? 'Araç belgesi';
      await this.notif.create({
        role: 'provider',
        recipientId: vehicle.providerId,
        type: decision === 'approved' ? 'vehicle_doc.approved' : 'vehicle_doc.rejected',
        title:
          decision === 'approved'
            ? `${vehicle.plate} · ${docName} onaylandı ✓`
            : `${vehicle.plate} · ${docName} reddedildi ✕`,
        body:
          decision === 'approved'
            ? `${docName} onaylandı.`
            : `${docName} reddedildi. Gerekçe: ${rejectionReason ?? '-'}.`,
        link: `/servisci/araclar/${vehicle.id}`,
      });
      await this.logActivity({
        adminId,
        action:
          decision === 'approved' ? 'vehicle_doc.approved' : 'vehicle_doc.rejected',
        targetType: 'provider',
        targetId: vehicle.providerId,
        summary: `${vehicle.plate} · ${docName} — ${decision === 'approved' ? 'onaylandı' : 'reddedildi'}`,
        meta: {
          documentId: docId,
          vehicleId: vehicle.id,
          reason: rejectionReason,
        },
      });
    }
    return { ok: true };
  }

  async reviewDriverDocument(
    docId: string,
    decision: 'approved' | 'rejected',
    rejectionReason: string | null,
    adminId: string,
  ) {
    const doc = await this.driverDocs.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Belge bulunamadı');
    if (decision === 'rejected' && !rejectionReason?.trim())
      throw new BadRequestException('Red gerekçesi zorunlu');
    doc.status = decision;
    doc.rejectionReason = decision === 'rejected' ? rejectionReason : null;
    doc.reviewedAt = new Date();
    doc.reviewedBy = adminId;
    await this.driverDocs.save(doc);

    const driver = await this.drivers.findOne({ where: { id: doc.driverId } });
    if (driver) {
      const def = await this.docDefs.findOne({ where: { id: doc.definitionId } });
      const docName = def?.name ?? 'Şoför belgesi';
      await this.notif.create({
        role: 'provider',
        recipientId: driver.providerId,
        type: decision === 'approved' ? 'driver_doc.approved' : 'driver_doc.rejected',
        title:
          decision === 'approved'
            ? `${driver.name} · ${docName} onaylandı ✓`
            : `${driver.name} · ${docName} reddedildi ✕`,
        body:
          decision === 'approved'
            ? `${docName} onaylandı.`
            : `${docName} reddedildi. Gerekçe: ${rejectionReason ?? '-'}.`,
        link: `/servisci/soforler/${driver.id}`,
      });
      await this.logActivity({
        adminId,
        action:
          decision === 'approved' ? 'driver_doc.approved' : 'driver_doc.rejected',
        targetType: 'provider',
        targetId: driver.providerId,
        summary: `${driver.name} · ${docName} — ${decision === 'approved' ? 'onaylandı' : 'reddedildi'}`,
        meta: { documentId: docId, driverId: driver.id, reason: rejectionReason },
      });
    }
    return { ok: true };
  }

  async reviewProviderDocument(
    providerId: string,
    docId: string,
    decision: 'approved' | 'rejected',
    rejectionReason: string | null,
    adminId: string,
  ) {
    const doc = await this.providerDocs.findOne({
      where: { id: docId, providerId },
    });
    if (!doc) throw new NotFoundException('Belge bulunamadı');
    if (decision === 'rejected' && !rejectionReason?.trim()) {
      throw new BadRequestException('Red gerekçesi zorunlu');
    }
    doc.status = decision;
    doc.rejectionReason = decision === 'rejected' ? rejectionReason : null;
    doc.reviewedAt = new Date();
    doc.reviewedBy = adminId;
    await this.providerDocs.save(doc);

    const def = await this.docDefs.findOne({ where: { id: doc.definitionId } });
    const docName = def?.name ?? 'Belge';
    await this.notif.create({
      role: 'provider',
      recipientId: providerId,
      type: decision === 'approved' ? 'doc.approved' : 'doc.rejected',
      title:
        decision === 'approved'
          ? `${docName} onaylandı ✓`
          : `${docName} reddedildi ✕`,
      body:
        decision === 'approved'
          ? `${docName} onaylandı. Diğer belgeleriniz beklerken belgelerim sayfasından takip edebilirsiniz.`
          : `${docName} reddedildi. Gerekçe: ${rejectionReason ?? '-'}. Panele girip tekrar yükleyebilirsiniz.`,
      link: '/servisci/belgelerim',
    });

    await this.logActivity({
      adminId,
      action: decision === 'approved' ? 'company_doc.approved' : 'company_doc.rejected',
      targetType: 'provider',
      targetId: providerId,
      summary: `${docName} — ${decision === 'approved' ? 'onaylandı' : 'reddedildi'}`,
      meta: { documentId: docId, reason: rejectionReason },
    });

    // Tüm zorunlu belgeler artık onaylıysa ve provider hâlâ pending_approval ise otomatik aktifleştir
    if (decision === 'approved') {
      const autoResult = await this.tryAutoActivate(providerId, adminId);
      if (autoResult.activated) {
        return { ok: true, autoActivated: true };
      }
    }
    return { ok: true };
  }

  private async tryAutoActivate(providerId: string, adminId: string) {
    const provider = await this.providers.findOne({
      where: { id: providerId },
      relations: ['subscriptions'],
    });
    if (!provider) return { activated: false };
    if (provider.status !== PROVIDER_STATUS.PENDING_APPROVAL) {
      return { activated: false };
    }

    const requiredDefs = await this.docDefs.find({
      where: { scope: 'company' as any, required: true, active: true },
    });
    const docs = await this.providerDocs.find({ where: { providerId } });
    const byDef = new Map(docs.map((d) => [d.definitionId, d]));
    const allApproved = requiredDefs.every(
      (def) => byDef.get(def.id)?.status === 'approved',
    );
    if (!allApproved) return { activated: false };

    // 12 ay abonelik uzat + şifre üret + SMS
    const now = new Date();
    const endsAt = new Date(now.getTime() + 12 * 30 * 24 * 3600 * 1000);
    for (const sub of provider.subscriptions ?? []) {
      if (!sub.approvedAt) {
        sub.startsAt = now;
        sub.endsAt = endsAt;
        sub.approvedAt = now;
        sub.approvedBy = adminId;
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

    await this.notif.create({
      role: 'provider',
      recipientId: provider.id,
      type: 'provider.approved',
      title: 'Hesabınız aktifleşti 🎉',
      body: 'Tüm belgeleriniz onaylandı. Talepleri görüntüleyip teklif verebilirsiniz.',
      link: '/servisci',
    });

    try {
      if (generatedPassword) {
        await this.sms.send(
          provider.phone,
          `Bindi: ${provider.companyName} tüm belgeleriniz onaylandı, hesabınız aktif! Giriş: bindi.com.tr/servisci/giris Telefon: ${provider.phone} Şifre: ${generatedPassword} (Girişten sonra şifrenizi değiştirin)`,
        );
      } else {
        await this.sms.send(
          provider.phone,
          `Bindi: Tüm belgeleriniz onaylandı. Panele giriş yapabilirsiniz: bindi.com.tr/servisci/giris`,
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Auto-activate SMS FAILED]', (e as Error).message);
    }
    return { activated: true };
  }

  async finalizeProviderReview(
    providerId: string,
    subscriptionMonths: number,
    adminId: string,
  ) {
    const provider = await this.providers.findOne({
      where: { id: providerId },
      relations: ['subscriptions'],
    });
    if (!provider) throw new NotFoundException();

    const requiredDefs = await this.docDefs.find({
      where: { scope: 'company' as any, required: true, active: true },
    });
    const docs = await this.providerDocs.find({ where: { providerId } });
    const byDef = new Map(docs.map((d) => [d.definitionId, d]));

    const missing = requiredDefs
      .filter((def) => {
        const d = byDef.get(def.id);
        return !d || d.status === 'rejected';
      })
      .map((def) => byDef.get(def.id) ?? { definitionName: def.name });
    const anyRejected = docs.some((d) => d.status === 'rejected');
    const rejectedNames = requiredDefs
      .filter((def) => byDef.get(def.id)?.status === 'rejected')
      .map((def) => def.name);

    const now = new Date();
    const endsAt = new Date(
      now.getTime() + subscriptionMonths * 30 * 24 * 3600 * 1000,
    );
    for (const sub of provider.subscriptions) {
      if (!sub.approvedAt) {
        sub.startsAt = now;
        sub.endsAt = endsAt;
        sub.approvedAt = now;
        sub.approvedBy = adminId;
        await this.subs.save(sub);
      }
    }

    let generatedPassword: string | null = null;
    if (!provider.passwordHash) {
      generatedPassword = generateSimplePassword();
      provider.passwordHash = await argon2.hash(generatedPassword);
      provider.mustChangePassword = true;
    }

    if (missing.length === 0 && !anyRejected) {
      provider.status = PROVIDER_STATUS.ACTIVE;
    } else {
      // Belgelerde eksik/red varsa hesap açık kalır ama status pending_approval'da tutulur
      provider.status = PROVIDER_STATUS.PENDING_APPROVAL;
    }
    await this.providers.save(provider);

    await this.notif.create({
      role: 'provider',
      recipientId: provider.id,
      type:
        rejectedNames.length > 0
          ? 'provider.docs_rejected'
          : 'provider.approved',
      title:
        rejectedNames.length > 0
          ? 'Bazı belgeleriniz reddedildi'
          : 'Hesabınız onaylandı 🎉',
      body:
        rejectedNames.length > 0
          ? `Reddedilen: ${rejectedNames.join(', ')}. Panelden tekrar yükleyin.`
          : 'Talepleri görüntüleyip teklif verebilirsiniz.',
      link: rejectedNames.length > 0 ? '/servisci/belgelerim' : '/servisci',
    });

    try {
      if (generatedPassword) {
        const base =
          rejectedNames.length > 0
            ? `Bindi: Bazı belgeleriniz reddedildi: ${rejectedNames.join(', ')}. Panele giriş yapıp tekrar yükleyin.`
            : `Bindi: ${provider.companyName} kaydınız onaylandı!`;
        await this.sms.send(
          provider.phone,
          `${base} Giriş: bindi.com.tr/servisci/giris Telefon: ${provider.phone} Şifre: ${generatedPassword} (Girişten sonra şifrenizi değiştirin)`,
        );
      } else if (rejectedNames.length > 0) {
        await this.sms.send(
          provider.phone,
          `Bindi: Bazı belgeleriniz reddedildi: ${rejectedNames.join(', ')}. Panele giriş yapıp tekrar yükleyin: bindi.com.tr/servisci/belgelerim`,
        );
      } else {
        await this.sms.send(
          provider.phone,
          `Bindi: Kaydınız onaylandı. bindi.com.tr/servisci/giris`,
        );
      }
    } catch (e) {
      // SMS başarısız olsa bile onay akışını durdurmuyoruz — sadece loglayalım
      // eslint-disable-next-line no-console
      console.error('[Finalize SMS FAILED]', (e as Error).message);
    }
    return {
      ok: true,
      status: provider.status,
      rejectedCount: rejectedNames.length,
    };
  }

  async setProviderSchools(providerId: string, schoolIds: string[]) {
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException();
    await this.providerSchools.delete({ provider: { id: providerId } });
    for (const sid of schoolIds) {
      await this.providerSchools.save(
        this.providerSchools.create({
          provider: { id: providerId } as Provider,
          school: { id: sid } as School,
        }),
      );
    }
    return { ok: true };
  }

  async setProviderRegions(
    providerId: string,
    regions: Array<{ city: string; district: string; neighborhood?: string }>,
  ) {
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException();
    await this.providerRegions.delete({ provider: { id: providerId } });
    for (const r of regions) {
      await this.providerRegions.save(
        this.providerRegions.create({
          provider: { id: providerId } as Provider,
          city: r.city,
          district: r.district,
          neighborhood: r.neighborhood ?? '*',
        }),
      );
    }
    return { ok: true };
  }

  async updateProvider(
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
    await this.providers.save(p);
    return { ok: true };
  }

  async updateProviderStatus(providerId: string, status: string) {
    const valid = ['pending_payment', 'pending_approval', 'active', 'suspended'];
    if (!valid.includes(status)) throw new BadRequestException('Geçersiz durum');
    const p = await this.providers.findOne({ where: { id: providerId } });
    if (!p) throw new NotFoundException();
    p.status = status as any;
    await this.providers.save(p);
    await this.notif.create({
      role: 'provider',
      recipientId: p.id,
      type: 'provider.status_changed',
      title:
        status === 'active'
          ? 'Hesabınız aktif edildi'
          : status === 'suspended'
            ? 'Hesabınız askıya alındı'
            : 'Hesap durumunuz güncellendi',
      body: `Yeni durum: ${status}`,
      link: '/servisci',
    });
    return { ok: true };
  }

  async updateProviderSubscription(
    providerId: string,
    subId: string,
    input: { startsAt?: string; endsAt?: string; approve?: boolean },
  ) {
    const sub = await this.subs.findOne({ where: { id: subId, providerId } });
    if (!sub) throw new NotFoundException();
    if (input.startsAt) sub.startsAt = new Date(input.startsAt);
    if (input.endsAt) sub.endsAt = new Date(input.endsAt);
    if (input.approve && !sub.approvedAt) sub.approvedAt = new Date();
    await this.subs.save(sub);
    return { ok: true };
  }

  async deleteProvider(providerId: string) {
    const p = await this.providers.findOne({ where: { id: providerId } });
    if (!p) throw new NotFoundException();
    try {
      await this.providers.remove(p);
      return { ok: true };
    } catch {
      p.status = 'suspended' as any;
      await this.providers.save(p);
      return { ok: true, softDeleted: true };
    }
  }

  async listPendingProviders() {
    return this.providers.find({
      where: [
        { status: PROVIDER_STATUS.PENDING_APPROVAL },
        { status: PROVIDER_STATUS.PENDING_PAYMENT },
      ],
      order: { createdAt: 'DESC' },
      relations: ['subscriptions'],
    });
  }

  async listAllProviders() {
    return this.providers.find({ order: { createdAt: 'DESC' } });
  }

  async approveProvider(
    providerId: string,
    subscriptionMonths: number,
    adminId: string,
  ) {
    const provider = await this.providers.findOne({
      where: { id: providerId },
      relations: ['subscriptions'],
    });
    if (!provider) throw new NotFoundException('Servisçi bulunamadı');
    if (!provider.subscriptions?.length)
      throw new BadRequestException('Abonelik bulunamadı');

    const now = new Date();
    const endsAt = new Date(
      now.getTime() + subscriptionMonths * 30 * 24 * 3600 * 1000,
    );
    for (const sub of provider.subscriptions) {
      if (!sub.approvedAt) {
        sub.startsAt = now;
        sub.endsAt = endsAt;
        sub.approvedAt = now;
        sub.approvedBy = adminId;
        await this.subs.save(sub);
      }
    }
    provider.status = PROVIDER_STATUS.ACTIVE;

    // Şifre yoksa random üret + argon2 hash + SMS ile bildir
    let generatedPassword: string | null = null;
    if (!provider.passwordHash) {
      generatedPassword = generateSimplePassword();
      provider.passwordHash = await argon2.hash(generatedPassword);
      provider.mustChangePassword = true;
    }
    await this.providers.save(provider);

    await this.notif.create({
      role: 'provider',
      recipientId: provider.id,
      type: 'provider.approved',
      title: 'Hesabınız onaylandı 🎉',
      body: 'Artık talepleri görüntüleyip teklif verebilirsiniz.',
      link: '/servisci',
    });

    try {
      if (generatedPassword) {
        await this.sms.send(
          provider.phone,
          `Bindi: ${provider.companyName} kaydınız onaylandı! Giriş: bindi.com.tr/servisci/giris  Telefon: ${provider.phone}  Şifre: ${generatedPassword}  (Girişten sonra şifrenizi değiştirin)`,
        );
      } else {
        await this.sms.send(
          provider.phone,
          `Bindi: Kaydınız onaylandı. bindi.com.tr/servisci/giris adresinden giriş yapabilirsiniz.`,
        );
      }
    } catch (e) {
      // SMS hatası akışı durdurmasın
    }
    return { ok: true };
  }

  async listSchools() {
    return this.schools.find({ order: { city: 'ASC', name: 'ASC' } });
  }

  async createSchool(input: {
    name: string;
    city: string;
    district: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) {
    return this.schools.save(this.schools.create(input));
  }

  async updateSchool(
    id: string,
    input: Partial<{
      name: string;
      city: string;
      district: string;
      address: string;
      active: boolean;
      latitude: number;
      longitude: number;
    }>,
  ) {
    const s = await this.schools.findOne({ where: { id } });
    if (!s) throw new NotFoundException();
    Object.assign(s, input);
    return this.schools.save(s);
  }

  async deleteSchool(id: string) {
    const s = await this.schools.findOne({ where: { id } });
    if (!s) throw new NotFoundException();
    try {
      await this.schools.remove(s);
      return { ok: true };
    } catch (e) {
      // Foreign key hatası — öğrenci/servisçi bağlantısı varsa soft delete
      s.active = false;
      await this.schools.save(s);
      return { ok: true, softDeleted: true };
    }
  }

  async listPackages() {
    return this.packages.find();
  }

  async updatePackagePrice(code: string, monthlyPrice: string) {
    const pkg = await this.packages.findOne({ where: { code } });
    if (!pkg) throw new NotFoundException();
    pkg.monthlyPrice = monthlyPrice;
    return this.packages.save(pkg);
  }

  async dashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayRequests = await this.requests.count({
      where: { createdAt: Between(startOfDay, new Date()) },
    });
    const monthRequests = await this.requests.count({
      where: { createdAt: Between(startOfMonth, new Date()) },
    });
    const activeProviders = await this.providers.count({
      where: { status: PROVIDER_STATUS.ACTIVE },
    });
    const pendingProviders = await this.providers.count({
      where: [
        { status: PROVIDER_STATUS.PENDING_APPROVAL },
        { status: PROVIDER_STATUS.PENDING_PAYMENT },
      ],
    });
    return { todayRequests, monthRequests, activeProviders, pendingProviders };
  }

  async dashboardFull() {
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Genel sayaçlar
    const [
      todayRequests,
      monthRequests,
      totalRequests,
      totalOffers,
      totalParents,
      totalProviders,
      activeProviders,
      pendingProviders,
      totalOffersSelected,
    ] = await Promise.all([
      this.requests.count({ where: { createdAt: Between(startOfDay, now) } }),
      this.requests.count({ where: { createdAt: Between(startOfMonth, now) } }),
      this.requests.count(),
      this.offers.count(),
      this.parents.count(),
      this.providers.count(),
      this.providers.count({ where: { status: PROVIDER_STATUS.ACTIVE } }),
      this.providers.count({
        where: [
          { status: PROVIDER_STATUS.PENDING_APPROVAL },
          { status: PROVIDER_STATUS.PENDING_PAYMENT },
        ],
      }),
      this.offers.count({ where: { status: 'selected' as any } }),
    ]);

    // Son 30 gün günlük talep sayısı
    const last30 = new Date();
    last30.setDate(last30.getDate() - 29);
    last30.setHours(0, 0, 0, 0);
    const dailyRows = await this.requests
      .createQueryBuilder('r')
      .select("DATE(r.created_at)", 'day')
      .addSelect('COUNT(*)::int', 'count')
      .where('r.created_at >= :d', { d: last30 })
      .groupBy("DATE(r.created_at)")
      .orderBy('day', 'ASC')
      .getRawMany();
    const dailyMap = new Map<string, number>();
    for (const r of dailyRows) dailyMap.set(String(r.day).slice(0, 10), Number(r.count));
    const daily: Array<{ day: string; count: number }> = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(last30);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ day: key, count: dailyMap.get(key) ?? 0 });
    }

    // Son 12 ay aylık kabul edilmiş teklif toplam ciro
    const last12 = new Date();
    last12.setMonth(last12.getMonth() - 11);
    last12.setDate(1);
    last12.setHours(0, 0, 0, 0);
    const monthlyRev = await this.offers
      .createQueryBuilder('o')
      .select("TO_CHAR(DATE_TRUNC('month', o.selected_at), 'YYYY-MM')", 'month')
      .addSelect('SUM(o.monthly_price)::float', 'revenue')
      .addSelect('COUNT(*)::int', 'count')
      .where('o.status = :s', { s: 'selected' })
      .andWhere('o.selected_at >= :d', { d: last12 })
      .groupBy("DATE_TRUNC('month', o.selected_at)")
      .orderBy("DATE_TRUNC('month', o.selected_at)", 'ASC')
      .getRawMany();
    const revMap = new Map<string, { revenue: number; count: number }>();
    for (const r of monthlyRev)
      revMap.set(r.month, { revenue: Number(r.revenue) || 0, count: Number(r.count) });
    const monthly: Array<{ month: string; revenue: number; count: number }> = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(last12);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const v = revMap.get(key) ?? { revenue: 0, count: 0 };
      monthly.push({ month: key, ...v });
    }

    // Aktif abonelik toplam aylık geliri
    const activeSubs = await this.subs.find({
      where: { endsAt: MoreThan(now) },
    });
    const packages = await this.packages.find();
    const pkgPrice = new Map(packages.map((p) => [p.code, Number(p.monthlyPrice)]));
    let activeMonthlyRevenue = 0;
    for (const s of activeSubs) {
      if (s.approvedAt) activeMonthlyRevenue += pkgPrice.get(s.packageCode) ?? 0;
    }

    // En çok kazanan servisçiler
    const topWinnersRaw = await this.offers
      .createQueryBuilder('o')
      .innerJoin('o.provider', 'p')
      .select('p.id', 'id')
      .addSelect('p.company_name', 'companyName')
      .addSelect('COUNT(*)::int', 'wonCount')
      .addSelect('SUM(o.monthly_price)::float', 'totalPrice')
      .where('o.status = :s', { s: 'selected' })
      .groupBy('p.id')
      .addGroupBy('p.company_name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    // En yüksek puanlı
    const topRatedRaw = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.provider', 'p')
      .select('p.id', 'id')
      .addSelect('p.company_name', 'companyName')
      .addSelect('AVG(r.rating)::float', 'avg')
      .addSelect('COUNT(r.id)::int', 'count')
      .groupBy('p.id')
      .addGroupBy('p.company_name')
      .having('COUNT(r.id) >= 1')
      .orderBy('AVG(r.rating)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      counts: {
        todayRequests,
        monthRequests,
        totalRequests,
        totalOffers,
        totalOffersSelected,
        totalParents,
        totalProviders,
        activeProviders,
        pendingProviders,
      },
      revenue: {
        activeMonthlyRevenue,
        subscriptionCount: activeSubs.filter((s) => s.approvedAt).length,
      },
      daily,
      monthly,
      topWinners: topWinnersRaw.map((r) => ({
        id: r.id,
        companyName: r.companyName,
        wonCount: Number(r.wonCount),
        totalPrice: Number(r.totalPrice) || 0,
      })),
      topRated: topRatedRaw.map((r) => ({
        id: r.id,
        companyName: r.companyName,
        avg: Number(r.avg),
        count: Number(r.count),
      })),
    };
  }

  async broadcast(input: {
    role: 'parent' | 'provider' | 'admin';
    recipientId?: string | null;
    title: string;
    body?: string;
    link?: string;
  }) {
    if (input.recipientId) {
      await this.notif.create({
        role: input.role,
        recipientId: input.recipientId,
        type: 'admin.broadcast',
        title: input.title,
        body: input.body,
        link: input.link,
      });
      return { ok: true, count: 1 };
    }
    if (input.role === 'admin') {
      await this.notif.create({
        role: 'admin',
        type: 'admin.broadcast',
        title: input.title,
        body: input.body,
        link: input.link,
      });
      return { ok: true, count: 1 };
    }
    // Toplu — tüm ilgili role
    const users =
      input.role === 'parent'
        ? await this.parents.find({ select: { id: true } })
        : await this.providers.find({ select: { id: true } });
    await this.notif.createMany(
      users.map((u) => ({
        role: input.role,
        recipientId: u.id,
        type: 'admin.broadcast',
        title: input.title,
        body: input.body,
        link: input.link,
      })),
    );
    return { ok: true, count: users.length };
  }

  async searchUsers(role: 'parent' | 'provider', query: string) {
    if (!query || query.length < 2) return [];
    const q = `%${query.toLowerCase()}%`;
    if (role === 'parent') {
      const rows = await this.parents
        .createQueryBuilder('p')
        .where('LOWER(p.name) LIKE :q OR p.phone LIKE :q', { q })
        .limit(10)
        .getMany();
      return rows.map((r) => ({ id: r.id, label: `${r.name} — ${r.phone}` }));
    }
    const rows = await this.providers
      .createQueryBuilder('p')
      .where('LOWER(p.company_name) LIKE :q OR p.phone LIKE :q OR LOWER(p.owner_name) LIKE :q', { q })
      .limit(10)
      .getMany();
    return rows.map((r) => ({ id: r.id, label: `${r.companyName} — ${r.phone}` }));
  }

  async listRequests() {
    const rows = await this.requests.find({
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['parent', 'offers', 'offers.provider'],
    });
    return rows.map((r) => {
      const selected = r.offers.find((o) => o.status === 'selected');
      return {
        id: r.id,
        status: r.status,
        city: r.city,
        district: r.district,
        neighborhood: r.neighborhood,
        createdAt: r.createdAt,
        parent: { name: r.parent.name, phone: r.parent.phone },
        offerCount: r.offers.length,
        selectedOffer: selected
          ? {
              id: selected.id,
              monthlyPrice: selected.monthlyPrice,
              selectedAt: selected.selectedAt,
              provider: {
                id: selected.provider.id,
                companyName: selected.provider.companyName,
                ownerName: selected.provider.ownerName,
                phone: selected.provider.phone,
              },
            }
          : null,
      };
    });
  }

  async requestDetail(id: string) {
    const r = await this.requests.findOne({
      where: { id },
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
    if (!r) throw new NotFoundException();

    const offers = [...r.offers].sort((a, b) => {
      const av = Number(a.monthlyPrice);
      const bv = Number(b.monthlyPrice);
      return av - bv;
    });
    const prices = offers.map((o) => Number(o.monthlyPrice));
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    const avg =
      prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0;

    return {
      id: r.id,
      status: r.status,
      city: r.city,
      district: r.district,
      neighborhood: r.neighborhood,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      pickupType: r.pickupType,
      notes: r.notes,
      magicToken: r.magicToken,
      createdAt: r.createdAt,
      parent: {
        id: r.parent.id,
        name: r.parent.name,
        phone: r.parent.phone,
        email: r.parent.email,
      },
      students: r.requestStudents.map((rs) => ({
        id: rs.student.id,
        name: rs.student.name,
        class: rs.student.class,
        school: rs.student.school
          ? {
              id: rs.student.school.id,
              name: rs.student.school.name,
              city: rs.student.school.city,
              district: rs.student.school.district,
            }
          : null,
      })),
      offers: offers.map((o) => ({
        id: o.id,
        monthlyPrice: Number(o.monthlyPrice),
        note: o.note,
        status: o.status,
        createdAt: o.createdAt,
        selectedAt: o.selectedAt,
        provider: {
          id: o.provider.id,
          companyName: o.provider.companyName,
          ownerName: o.provider.ownerName,
          phone: o.provider.phone,
          email: o.provider.email,
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
      stats: {
        offerCount: offers.length,
        minPrice: min,
        maxPrice: max,
        avgPrice: avg,
      },
    };
  }

  async logActivity(input: {
    adminId: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    summary?: string;
    meta?: Record<string, unknown>;
  }) {
    try {
      await this.activityLog.save(
        this.activityLog.create({
          adminId: input.adminId,
          action: input.action,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          summary: input.summary ?? null,
          meta: input.meta ?? null,
        }),
      );
    } catch {}
  }

  async listActivityLog(limit = 100) {
    const rows = await this.activityLog
      .createQueryBuilder('l')
      .orderBy('l.created_at', 'DESC')
      .limit(limit)
      .getMany();
    // Admin adlarını enrich et
    const adminIds = Array.from(
      new Set(rows.map((r) => r.adminId).filter(Boolean)),
    ) as string[];
    const admins = adminIds.length
      ? await this.users.find({
          where: adminIds.map((id) => ({ id })),
        })
      : [];
    const byId = new Map(admins.map((a) => [a.id, a.email]));
    return rows.map((r) => ({
      id: r.id,
      adminId: r.adminId,
      adminEmail: r.adminId ? (byId.get(r.adminId) ?? '(silinmiş admin)') : null,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      summary: r.summary,
      meta: r.meta,
      createdAt: r.createdAt,
    }));
  }
}

function generateSimplePassword(): string {
  // 6 haneli rakam (baştaki sıfır olmasın diye ilk hane 1-9)
  let out = String(1 + Math.floor(Math.random() * 9));
  for (let i = 0; i < 5; i++) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

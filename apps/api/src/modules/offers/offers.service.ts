import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Offer } from '@servis/db';
import { ServiceRequest } from '@servis/db';
import { Vehicle } from '@servis/db';
import { Provider } from '@servis/db';
import { ProviderDocument, DocumentDefinition } from '@servis/db';
import { OFFER_STATUS, REQUEST_STATUS } from '@servis/shared';
import { SmsService } from '../sms/sms.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

export interface CreateOfferInput {
  requestId: string;
  monthlyPrice: string;
  vehicleId?: string;
  note?: string;
}

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    @InjectRepository(ServiceRequest)
    private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderDocument)
    private readonly providerDocs: Repository<ProviderDocument>,
    @InjectRepository(DocumentDefinition)
    private readonly docDefs: Repository<DocumentDefinition>,
    private readonly sms: SmsService,
    private readonly notif: NotificationsService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  private async assertDocsClean(providerId: string) {
    const requiredDefs = await this.docDefs.find({
      where: { scope: 'company' as any, required: true, active: true },
    });
    const docs = await this.providerDocs.find({ where: { providerId } });
    const byDef = new Map(docs.map((d) => [d.definitionId, d]));
    const problems: string[] = [];
    for (const def of requiredDefs) {
      const d = byDef.get(def.id);
      if (!d) problems.push(`${def.name} (yüklenmedi)`);
      else if (d.status === 'rejected') problems.push(`${def.name} (reddedildi)`);
      else if (d.status === 'pending') problems.push(`${def.name} (onay bekliyor)`);
    }
    if (problems.length > 0) {
      throw new ForbiddenException(
        `Zorunlu belgeleriniz tamamlanmadan teklif veremezsiniz: ${problems.join(', ')}. Belgelerim sayfasından tamamlayın.`,
      );
    }
  }

  async create(providerId: string, input: CreateOfferInput) {
    const provider = await this.providers.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Servisçi bulunamadı');
    if (provider.status !== 'active') {
      throw new ForbiddenException(
        'Hesabınız henüz aktif değil. Belge onayı tamamlanınca teklif verebilirsiniz.',
      );
    }
    // Tüm zorunlu belgeler onaylı değilse teklif verilmez (admin sonra bir belgeyi reddederse de bu geçerli)
    await this.assertDocsClean(providerId);

    const request = await this.requests.findOne({ where: { id: input.requestId } });
    if (!request) throw new NotFoundException('Talep bulunamadı');
    if (request.status !== REQUEST_STATUS.OPEN)
      throw new BadRequestException('Talep artık teklif almıyor');

    if (input.vehicleId) {
      const vehicle = await this.vehicles.findOne({
        where: { id: input.vehicleId, providerId },
      });
      if (!vehicle) throw new BadRequestException('Araç bulunamadı');
    }

    // Aynı araç için mevcut teklif var mı?
    const existing = await this.offers.findOne({
      where: {
        requestId: input.requestId,
        providerId,
        vehicleId: input.vehicleId ?? (null as any),
      },
    });
    if (existing) {
      throw new BadRequestException(
        input.vehicleId
          ? 'Bu araç için zaten teklif verdiniz. Teklif değiştirilemez.'
          : 'Bu talebe araçsız bir teklifiniz zaten var.',
      );
    }

    const offer = this.offers.create({
      requestId: input.requestId,
      providerId,
      vehicleId: input.vehicleId ?? null,
      monthlyPrice: input.monthlyPrice,
      note: input.note ?? null,
      status: OFFER_STATUS.PENDING,
    });
    const saved = await this.offers.save(offer);

    await this.notif.create({
      role: 'parent',
      recipientId: request.parentId,
      type: 'offer.created',
      title: 'Yeni teklif geldi',
      body: `Bir servisçi ${Number(input.monthlyPrice).toLocaleString('tr-TR')} ₺/ay teklif verdi.`,
      link: '/veli',
    });
    await this.notif.create({
      role: 'admin',
      type: 'offer.created',
      title: 'Yeni teklif',
      body: `${provider?.companyName ?? ''} — ${Number(input.monthlyPrice).toLocaleString('tr-TR')} ₺`,
      link: '/admin/talepler',
    });
    return saved;
  }

  async listForProvider(providerId: string) {
    const rows = await this.offers.find({
      where: { providerId },
      relations: [
        'request',
        'request.parent',
        'request.requestStudents',
        'request.requestStudents.student',
        'request.requestStudents.student.school',
        'vehicle',
      ],
      order: { createdAt: 'DESC' },
    });
    return rows.map((o) => ({
      id: o.id,
      monthlyPrice: o.monthlyPrice,
      note: o.note,
      status: o.status,
      createdAt: o.createdAt,
      selectedAt: o.selectedAt,
      vehicle: o.vehicle
        ? {
            id: o.vehicle.id,
            brand: o.vehicle.brand,
            model: o.vehicle.model,
            year: o.vehicle.year,
            plate: o.vehicle.plate,
          }
        : null,
      request: {
        id: o.request.id,
        status: o.request.status,
        city: o.request.city,
        district: o.request.district,
        neighborhood: o.request.neighborhood,
        address: o.request.address,
        pickupType: o.request.pickupType,
        notes: o.request.notes,
        parent:
          o.status === 'selected'
            ? { name: o.request.parent.name, phone: o.request.parent.phone }
            : {
                name: o.request.parent.name.charAt(0) + '***',
                phone: '****' + o.request.parent.phone.slice(-2),
              },
        students: o.request.requestStudents.map((rs) => ({
          name: rs.student.name,
          class: rs.student.class,
          school: rs.student.school
            ? { id: rs.student.school.id, name: rs.student.school.name }
            : null,
        })),
      },
    }));
  }

  async selectByMagicToken(token: string, offerId: string) {
    const request = await this.requests.findOne({
      where: { magicToken: token },
      relations: ['offers', 'parent'],
    });
    if (!request) throw new NotFoundException('Talep bulunamadı');
    if (request.magicExpiresAt.getTime() < Date.now())
      throw new BadRequestException('Talep linkinin süresi dolmuş');
    if (request.status === REQUEST_STATUS.CLOSED)
      throw new BadRequestException('Talep zaten kapatılmış');

    const selected = request.offers.find((o) => o.id === offerId);
    if (!selected) throw new NotFoundException('Teklif bulunamadı');
    if (selected.status !== OFFER_STATUS.PENDING)
      throw new BadRequestException('Teklif zaten değerlendirilmiş');

    selected.status = OFFER_STATUS.SELECTED;
    selected.selectedAt = new Date();
    for (const other of request.offers) {
      if (other.id !== offerId && other.status === OFFER_STATUS.PENDING) {
        other.status = OFFER_STATUS.REJECTED;
      }
    }
    await this.offers.save(request.offers);
    request.status = REQUEST_STATUS.CLOSED;
    await this.requests.save(request);

    const provider = await this.providers.findOne({ where: { id: selected.providerId } });
    if (provider) {
      try {
        await this.sms.send(
          provider.phone,
          `Tebrikler! Bir veli teklifinizi seçti. Panelden detayları görün.`,
        );
      } catch (e) {
        this.logger.warn(`Notify provider failed: ${(e as Error).message}`);
      }
      await this.notif.create({
        role: 'provider',
        recipientId: provider.id,
        type: 'offer.selected',
        title: 'Teklifiniz seçildi 🎉',
        body: `${request.parent.name} sizi tercih etti.`,
        link: '/servisci/tekliflerim',
      });
    }
    await this.notif.create({
      role: 'admin',
      type: 'offer.selected',
      title: 'Teklif seçildi',
      body: `${provider?.companyName ?? ''} — ${request.parent.name}`,
      link: '/admin/talepler',
    });
    try {
      await this.enrollments.ensureFromSelectedOffer(selected.id);
    } catch (e) {
      this.logger.warn(`Enrollment create failed: ${(e as Error).message}`);
    }
    return { ok: true };
  }

  async unselectByMagicToken(token: string) {
    const request = await this.requests.findOne({
      where: { magicToken: token },
      relations: ['offers', 'parent'],
    });
    if (!request) throw new NotFoundException('Talep bulunamadı');
    if (request.status === REQUEST_STATUS.OPEN)
      throw new BadRequestException('Zaten açık bir talep');
    for (const o of request.offers) {
      if (o.status !== OFFER_STATUS.PENDING) {
        o.status = OFFER_STATUS.PENDING;
        o.selectedAt = null;
      }
    }
    await this.offers.save(request.offers);
    request.status = REQUEST_STATUS.OPEN;
    await this.requests.save(request);

    // Teklif veren servisçilere bilgilendirici bildirim (yeni fırsat)
    const providerIds = Array.from(new Set(request.offers.map((o) => o.providerId)));
    await this.notif.createMany(
      providerIds.map((pid) => ({
        role: 'provider' as const,
        recipientId: pid,
        type: 'offer.reactivated',
        title: 'Teklifiniz tekrar aktif',
        body: `Veli seçimini iptal etti. Teklifiniz hâlâ geçerli.`,
        link: '/servisci/tekliflerim',
      })),
    );
    await this.notif.create({
      role: 'admin',
      type: 'offer.reactivated',
      title: 'Veli seçimini iptal etti',
      body: request.parent.name,
      link: '/admin/talepler',
    });
    return { ok: true };
  }

  async unselectByParent(parentId: string, requestId: string) {
    const request = await this.requests.findOne({
      where: { id: requestId, parentId },
    });
    if (!request) throw new NotFoundException();
    return this.unselectByMagicToken(request.magicToken);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ServiceRequest,
  ProviderSchool,
  ProviderRegion,
  RequestStudent,
  Offer,
  ProviderDismissal,
  Provider,
} from '@servis/db';
import {
  ProviderJwtStrategy,
  ProviderRequest,
} from '../providers/provider-jwt.strategy';
import { REQUEST_STATUS } from '@servis/shared';
import { haversineKm, etaMinutes } from '../../common/geo';

// İsim -> Baş harf maskesi ("Elif Güven" -> "E.G.")
function maskInitials(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map((p) => p[0].toUpperCase() + '.').join('');
}

// Adres text'ini bulanıklaştır: sokak/no bilgisini kırp, ilk 2 kelimeyi tut
function maskAddress(address: string | null | undefined): string {
  if (!address) return '';
  const words = address.trim().split(/\s+/);
  if (words.length <= 2) return address;
  return words.slice(0, 2).join(' ') + '...';
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/requests')
export class RequestsProviderController {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(ProviderSchool)
    private readonly providerSchools: Repository<ProviderSchool>,
    @InjectRepository(ProviderRegion)
    private readonly providerRegions: Repository<ProviderRegion>,
    @InjectRepository(RequestStudent)
    private readonly requestStudents: Repository<RequestStudent>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    @InjectRepository(ProviderDismissal)
    private readonly dismissals: Repository<ProviderDismissal>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
  ) {}

  private async assertActive(providerId: string) {
    const p = await this.providers.findOne({ where: { id: providerId } });
    if (!p || p.status !== 'active') {
      throw new ForbiddenException(
        'Hesabınız henüz aktif değil. Belge onayı tamamlanmadan talepleri görüntüleyip teklif veremezsiniz.',
      );
    }
  }

  @Get()
  async list(@Req() req: ProviderRequest) {
    const providerId = req.provider.id;
    await this.assertActive(providerId);
    const schools = await this.providerSchools.find({
      where: { provider: { id: providerId } },
      relations: ['school'],
    });
    const schoolIds = schools.map((s) => s.school.id);
    if (schoolIds.length === 0) return [];

    const regions = await this.providerRegions.find({
      where: { provider: { id: providerId } },
    });
    if (regions.length === 0) return [];

    const cityDistrictSet = new Set(regions.map((r) => `${r.city}|${r.district}`));

    const rsRows = await this.requestStudents
      .createQueryBuilder('rs')
      .innerJoin('rs.student', 'st')
      .innerJoin('rs.request', 'r')
      .where('st.school_id IN (:...schoolIds)', { schoolIds })
      .andWhere('r.status = :status', { status: REQUEST_STATUS.OPEN })
      .select(['rs.request_id AS "requestId"'])
      .getRawMany();

    const candidateRequestIds = Array.from(
      new Set(rsRows.map((r) => r.requestId)),
    );
    if (candidateRequestIds.length === 0) return [];

    // Reddedilenler
    const dismissed = new Set(
      (
        await this.dismissals.find({
          where: {
            providerId,
            requestId: In(candidateRequestIds),
          },
        })
      ).map((d) => d.requestId),
    );

    const requests = await this.requests.find({
      where: { id: In(candidateRequestIds) },
      relations: [
        'requestStudents',
        'requestStudents.student',
        'requestStudents.student.school',
      ],
      order: { createdAt: 'DESC' },
    });
    const filtered = requests.filter(
      (r) => cityDistrictSet.has(`${r.city}|${r.district}`) && !dismissed.has(r.id),
    );

    const existingOffers = await this.offers.find({
      where: { providerId, requestId: In(filtered.map((r) => r.id)) },
    });
    const offerMap = new Map(existingOffers.map((o) => [o.requestId, o]));

    return filtered.map((r) => {
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
        pickupType: r.pickupType,
        notes: r.notes,
        createdAt: r.createdAt,
        distanceKm,
        etaMin,
        hasLocation: r.latitude != null && r.longitude != null,
        students: r.requestStudents.map((rs) => ({
          name: maskInitials(rs.student.name), // gizlilik: E.G. gibi
          class: rs.student.class,
          school: rs.student.school
            ? { id: rs.student.school.id, name: rs.student.school.name }
            : null,
        })),
        myOffer: offerMap.get(r.id)
          ? {
              id: offerMap.get(r.id)!.id,
              monthlyPrice: offerMap.get(r.id)!.monthlyPrice,
              status: offerMap.get(r.id)!.status,
            }
          : null,
      };
    });
  }

  @Get(':id')
  async detail(@Req() req: ProviderRequest, @Param('id') id: string) {
    const providerId = req.provider.id;
    await this.assertActive(providerId);
    const request = await this.requests.findOne({
      where: { id },
      relations: [
        'parent',
        'requestStudents',
        'requestStudents.student',
        'requestStudents.student.school',
      ],
    });
    if (!request) return null;

    const myOffers = await this.offers.find({
      where: { requestId: id, providerId },
      relations: ['vehicle'],
    });
    const dismissed = await this.dismissals.findOne({
      where: { providerId, requestId: id },
    });
    const hasOffer = myOffers.length > 0;
    // Tam bilgi (isim/telefon/adres) SADECE teklif seçildiyse görünür (KVKK)
    const isSelected = myOffers.some((o) => o.status === 'selected');

    const firstSchool = request.requestStudents[0]?.student?.school ?? null;
    let distanceKm: number | null = null;
    let etaMin: number | null = null;
    if (
      request.latitude != null && request.longitude != null &&
      firstSchool && firstSchool.latitude != null && firstSchool.longitude != null
    ) {
      distanceKm = Math.round(haversineKm(
        { lat: request.latitude, lng: request.longitude },
        { lat: firstSchool.latitude, lng: firstSchool.longitude },
      ) * 10) / 10;
      etaMin = etaMinutes(distanceKm);
    }

    return {
      id: request.id,
      status: request.status,
      city: request.city,
      district: request.district,
      neighborhood: request.neighborhood,
      // KVKK: adres teklif verildiğinde de gizlenir, sadece seçilen servisçi görür
      address: isSelected ? request.address : maskAddress(request.address),
      latitude: request.latitude,
      longitude: request.longitude,
      pickupType: request.pickupType,
      notes: request.notes,
      createdAt: request.createdAt,
      distanceKm,
      etaMin,
      hasLocation: request.latitude != null && request.longitude != null,
      // KVKK: veli iletişim SADECE seçilene açılır
      parent: isSelected
        ? { name: request.parent.name, phone: request.parent.phone }
        : {
            name: maskInitials(request.parent.name),
            phone: '****' + request.parent.phone.slice(-2),
          },
      students: request.requestStudents.map((rs) => ({
        // KVKK: öğrenci ismi sadece seçilene açılır
        name: isSelected ? rs.student.name : maskInitials(rs.student.name),
        class: rs.student.class,
        school: rs.student.school,
      })),
      isSelected,
      hasOffer,
      myOffers: myOffers.map((o) => ({
        id: o.id,
        monthlyPrice: o.monthlyPrice,
        note: o.note,
        status: o.status,
        vehicleId: o.vehicleId,
        vehicle: o.vehicle
          ? {
              id: o.vehicle.id,
              brand: o.vehicle.brand,
              model: o.vehicle.model,
              plate: o.vehicle.plate,
            }
          : null,
      })),
      dismissed: !!dismissed,
    };
  }

  @Post(':id/decline')
  async decline(@Req() req: ProviderRequest, @Param('id') id: string) {
    const providerId = req.provider.id;
    const existingOffer = await this.offers.findOne({
      where: { requestId: id, providerId },
    });
    if (existingOffer)
      throw new BadRequestException(
        'Bu talebe zaten teklif verdiniz, reddedemezsiniz.',
      );
    const existing = await this.dismissals.findOne({
      where: { providerId, requestId: id },
    });
    if (existing) return { ok: true, already: true };
    await this.dismissals.save(
      this.dismissals.create({ providerId, requestId: id }),
    );
    return { ok: true };
  }

  @Delete(':id/decline')
  async undecline(@Req() req: ProviderRequest, @Param('id') id: string) {
    const providerId = req.provider.id;
    const existing = await this.dismissals.findOne({
      where: { providerId, requestId: id },
    });
    if (existing) await this.dismissals.remove(existing);
    return { ok: true };
  }
}

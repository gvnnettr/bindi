import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Trip, TripEnrollment, Enrollment, StudentGuardian, Offer } from '@servis/db';
import { PushService } from '../push/push.service';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripEnrollment) private readonly tripEnrollments: Repository<TripEnrollment>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(StudentGuardian) private readonly guardians: Repository<StudentGuardian>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    private readonly ds: DataSource,
    private readonly push: PushService,
  ) {}

  async start(
    providerId: string,
    input: { vehicleId?: string; enrollmentIds: string[]; routeName?: string },
  ) {
    if (input.enrollmentIds.length === 0) {
      throw new BadRequestException('En az bir kayıt seçilmeli');
    }

    // Aktif servisi zaten varsa reddet
    const existing = await this.trips.findOne({
      where: { providerId, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException('Zaten aktif bir servis var. Önce mevcut olanı bitir.');
    }

    // Enrollment'ların bu servisçiye ait olduğunu doğrula
    const validEnrollments = await this.enrollments.find({
      where: { id: In(input.enrollmentIds), providerId, status: 'active' },
      relations: ['student', 'student.school', 'parent'],
    });
    if (validEnrollments.length !== input.enrollmentIds.length) {
      throw new BadRequestException('Geçersiz kayıt(lar) — sadece kendi aktif kayıtlarını seçebilirsin');
    }

    const trip = await this.ds.transaction(async (m) => {
      const t = m.getRepository(Trip).create({
        providerId,
        vehicleId: input.vehicleId ?? null,
        routeName: input.routeName ?? null,
        status: 'active',
        startedAt: new Date(),
        currentLat: null,
        currentLng: null,
        locationUpdatedAt: null,
        endedAt: null,
      });
      const saved = await m.getRepository(Trip).save(t);

      const junctions = input.enrollmentIds.map((eid) =>
        m.getRepository(TripEnrollment).create({
          tripId: saved.id,
          enrollmentId: eid,
        }),
      );
      await m.getRepository(TripEnrollment).save(junctions);
      return saved;
    });

    // Velilere push bildir "Servis yola çıktı"
    const parentIds = new Set<string>();
    for (const e of validEnrollments) {
      parentIds.add(e.parent.id);
      // Guardian (aile üyeleri) da bildirim alsın
      const gs = await this.guardians.find({ where: { studentId: e.student.id } });
      for (const g of gs) parentIds.add(g.parentId);
    }
    const providerName = validEnrollments[0]?.parent?.name ?? 'Servisçin';
    for (const pid of parentIds) {
      void this.push.sendToRecipient('parent', pid, {
        title: 'Servis yola çıktı',
        body: `${providerName} servisi başladı. Konumu takip edebilirsin.`,
        data: { type: 'trip.started', tripId: trip.id },
      });
    }

    return { id: trip.id, startedAt: trip.startedAt };
  }

  async updateLocation(providerId: string, tripId: string, lat: number, lng: number) {
    const trip = await this.trips.findOne({ where: { id: tripId, providerId } });
    if (!trip) throw new NotFoundException('Servis bulunamadı');
    if (trip.status !== 'active') throw new BadRequestException('Servis aktif değil');
    trip.currentLat = String(lat);
    trip.currentLng = String(lng);
    trip.locationUpdatedAt = new Date();
    await this.trips.save(trip);

    // PROXIMITY: her enrollment icin eve mesafe < 2km ise ve daha once bildirim gitmemisse push
    void this.checkProximityAndNotify(tripId, lat, lng);

    return { ok: true };
  }

  private async checkProximityAndNotify(tripId: string, lat: number, lng: number) {
    try {
      const junctions = await this.tripEnrollments.find({ where: { tripId } });
      const pending = junctions.filter((j) => !j.proximityNotifiedAt && j.boardStatus === 'pending');
      if (pending.length === 0) return;
      const es = await this.enrollments.find({
        where: { id: In(pending.map((p) => p.enrollmentId)) },
        relations: ['student', 'parent', 'offer', 'offer.request'],
      });
      for (const e of es) {
        const homeLat = e.offer?.request?.latitude != null ? Number(e.offer.request.latitude) : null;
        const homeLng = e.offer?.request?.longitude != null ? Number(e.offer.request.longitude) : null;
        if (homeLat == null || homeLng == null) continue;
        const km = haversineKm(lat, lng, homeLat, homeLng);
        if (km > 2) continue; // 2km yaklastigi zaman

        const j = pending.find((p) => p.enrollmentId === e.id);
        if (!j) continue;
        const minutes = Math.max(1, Math.round(km * 2)); // sehir ici 2 dk/km
        // Veliye + tum guardian'lara push
        const guardians = await this.guardians.find({ where: { studentId: e.student.id } });
        const parentIds = new Set<string>([e.parent.id, ...guardians.map((g) => g.parentId)]);
        for (const pid of parentIds) {
          void this.push.sendToRecipient('parent', pid, {
            title: 'Servis yaklaşıyor',
            body: `${e.student.name} için servis ~${minutes} dk uzaklıkta.`,
            data: { type: 'trip.proximity', tripId, enrollmentId: e.id },
          });
        }
        j.proximityNotifiedAt = new Date();
        await this.tripEnrollments.save(j);
      }
    } catch (err) {
      // sessiz - konum guncelleme akisi bozulmasin
    }
  }

  async end(providerId: string, tripId: string) {
    const trip = await this.trips.findOne({ where: { id: tripId, providerId } });
    if (!trip) throw new NotFoundException('Servis bulunamadı');
    if (trip.status !== 'active') return { ok: true };
    trip.status = 'ended';
    trip.endedAt = new Date();
    await this.trips.save(trip);

    // Velilere bildir "Servis tamamlandı"
    const junctions = await this.tripEnrollments.find({ where: { tripId } });
    const enrollmentIds = junctions.map((j) => j.enrollmentId);
    if (enrollmentIds.length > 0) {
      const es = await this.enrollments.find({
        where: { id: In(enrollmentIds) },
        relations: ['student', 'parent'],
      });
      const parentIds = new Set<string>();
      for (const e of es) {
        parentIds.add(e.parent.id);
        const gs = await this.guardians.find({ where: { studentId: e.student.id } });
        for (const g of gs) parentIds.add(g.parentId);
      }
      for (const pid of parentIds) {
        void this.push.sendToRecipient('parent', pid, {
          title: 'Servis tamamlandı',
          body: 'Servis başarıyla tamamlandı. İyi günler.',
          data: { type: 'trip.ended', tripId },
        });
      }
    }
    return { ok: true };
  }

  async getActiveTrip(providerId: string) {
    const trip = await this.trips.findOne({
      where: { providerId, status: 'active' },
      relations: ['vehicle'],
    });
    if (!trip) return null;
    const junctions = await this.tripEnrollments.find({ where: { tripId: trip.id } });
    const enrollmentIds = junctions.map((j) => j.enrollmentId);
    const es = await this.enrollments.find({
      where: { id: In(enrollmentIds) },
      relations: ['student', 'parent', 'offer', 'offer.request'],
    });
    const junctionMap = new Map(junctions.map((j) => [j.enrollmentId, j]));
    // orderNo'ya gore siralanmis, null'lar sona
    const sortedEs = [...es].sort((a, b) => {
      const ao = a.orderNo ?? 999999;
      const bo = b.orderNo ?? 999999;
      return ao - bo;
    });
    return {
      id: trip.id,
      startedAt: trip.startedAt,
      routeName: trip.routeName,
      currentLat: trip.currentLat ? Number(trip.currentLat) : null,
      currentLng: trip.currentLng ? Number(trip.currentLng) : null,
      locationUpdatedAt: trip.locationUpdatedAt,
      vehicle: trip.vehicle ? {
        id: trip.vehicle.id,
        brand: trip.vehicle.brand,
        model: trip.vehicle.model,
        plate: trip.vehicle.plate,
      } : null,
      enrollments: sortedEs.map((e) => {
        const j = junctionMap.get(e.id);
        return {
          id: e.id,
          orderNo: e.orderNo,
          boardStatus: j?.boardStatus ?? 'pending',
          boardedAt: j?.boardedAt ?? null,
          student: { id: e.student.id, name: e.student.name },
          parent: { id: e.parent.id, name: e.parent.name },
          address: e.offer?.request?.address ?? null,
        };
      }),
    };
  }

  async markBoarding(
    providerId: string,
    tripId: string,
    input: { enrollmentId: string; status: 'boarded' | 'missed' | 'pending' },
  ) {
    const trip = await this.trips.findOne({ where: { id: tripId, providerId } });
    if (!trip) throw new NotFoundException('Servis bulunamadı');
    if (trip.status !== 'active') throw new BadRequestException('Servis aktif değil');
    const junction = await this.tripEnrollments.findOne({
      where: { tripId, enrollmentId: input.enrollmentId },
    });
    if (!junction) throw new NotFoundException('Öğrenci bu serviste değil');
    junction.boardStatus = input.status;
    junction.boardedAt = input.status === 'boarded' ? new Date() : null;
    await this.tripEnrollments.save(junction);

    if (input.status === 'boarded') {
      // Veliye + guardian'lara push
      const e = await this.enrollments.findOne({
        where: { id: input.enrollmentId },
        relations: ['student', 'parent'],
      });
      if (e) {
        const guardians = await this.guardians.find({ where: { studentId: e.student.id } });
        const parentIds = new Set<string>([e.parent.id, ...guardians.map((g) => g.parentId)]);
        const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        for (const pid of parentIds) {
          void this.push.sendToRecipient('parent', pid, {
            title: 'Servise bindi',
            body: `${e.student.name} · ${time}'de araca bindi.`,
            data: { type: 'trip.boarded', tripId, enrollmentId: input.enrollmentId },
          });
        }
      }
    }
    return { ok: true };
  }

  // Araç detay: bu araca atanmiş aktif enrollment'lari siralanmiş döndür
  async listVehicleStudents(providerId: string, vehicleId: string) {
    const es = await this.enrollments.find({
      where: { providerId, vehicleId, status: 'active' },
      relations: ['student', 'student.school', 'parent', 'offer', 'offer.request'],
    });
    const sorted = [...es].sort((a, b) => {
      const ao = a.orderNo ?? 999999;
      const bo = b.orderNo ?? 999999;
      return ao - bo;
    });
    return sorted.map((e) => ({
      id: e.id,
      orderNo: e.orderNo,
      student: { id: e.student.id, name: e.student.name, class: e.student.class },
      school: e.student.school ? { id: e.student.school.id, name: e.student.school.name } : null,
      parentPhone: e.parent.phone,
      address: e.offer?.request?.address ?? null,
    }));
  }

  // Bu servisçinin araca atanmamış aktif enrollment'ları (Ekle listesi için)
  async listUnassignedEnrollments(providerId: string) {
    const es = await this.enrollments.find({
      where: { providerId, vehicleId: IsNull(), status: 'active' },
      relations: ['student', 'student.school'],
    });
    return es.map((e) => ({
      id: e.id,
      student: { id: e.student.id, name: e.student.name },
      school: e.student.school ? { name: e.student.school.name } : null,
    }));
  }

  async assignEnrollmentToVehicle(
    providerId: string,
    enrollmentId: string,
    vehicleId: string | null,
  ) {
    const e = await this.enrollments.findOne({ where: { id: enrollmentId, providerId } });
    if (!e) throw new NotFoundException('Kayıt bulunamadı');
    e.vehicleId = vehicleId;
    // Yeni araca eklendiginde en sona koy
    if (vehicleId) {
      const existing = await this.enrollments.find({ where: { providerId, vehicleId } });
      const maxOrder = existing.reduce((mx, x) => Math.max(mx, x.orderNo ?? 0), 0);
      e.orderNo = maxOrder + 1;
    } else {
      e.orderNo = null;
    }
    await this.enrollments.save(e);
    return { ok: true };
  }

  async reorderVehicleStudents(
    providerId: string,
    vehicleId: string,
    orderedEnrollmentIds: string[],
  ) {
    const es = await this.enrollments.find({
      where: { providerId, vehicleId, status: 'active' },
    });
    const byId = new Map(es.map((e) => [e.id, e]));
    let i = 1;
    for (const eid of orderedEnrollmentIds) {
      const e = byId.get(eid);
      if (e) {
        e.orderNo = i++;
        await this.enrollments.save(e);
      }
    }
    return { ok: true };
  }

  async getActiveTripsForParent(parentId: string) {
    // Kendi çocukları + guardian olduğu çocuklar
    const guardianStudentIds = (
      await this.guardians.find({ where: { parentId } })
    ).map((g) => g.studentId);

    const ownEs = await this.enrollments.find({
      where: { parentId, status: 'active' },
      relations: ['student', 'provider'],
    });
    const guardianEs = guardianStudentIds.length > 0
      ? await this.enrollments.find({
          where: { studentId: In(guardianStudentIds), status: 'active' },
          relations: ['student', 'provider'],
        })
      : [];

    const enrollmentMap = new Map<string, Enrollment>();
    for (const e of [...ownEs, ...guardianEs]) enrollmentMap.set(e.id, e);
    const enrollmentIds = Array.from(enrollmentMap.keys());
    if (enrollmentIds.length === 0) return [];

    const junctions = await this.tripEnrollments.find({
      where: { enrollmentId: In(enrollmentIds) },
    });
    const tripIds = Array.from(new Set(junctions.map((j) => j.tripId)));
    if (tripIds.length === 0) return [];

    const activeTrips = await this.trips.find({
      where: { id: In(tripIds), status: 'active' },
      relations: ['vehicle', 'provider'],
    });

    // Ev konumunu (parent adresi) enrollment.offer.request.lat/lng'den al
    const offerIds = Array.from(new Set(
      Array.from(enrollmentMap.values()).map((e) => e.offerId).filter((x): x is string => !!x),
    ));
    const offerRequestMap = new Map<string, { lat: number | null; lng: number | null; address: string | null }>();
    if (offerIds.length > 0) {
      const offers = await this.offers.find({
        where: { id: In(offerIds) },
        relations: ['request'],
      });
      for (const o of offers) {
        if (o.request) {
          offerRequestMap.set(o.id, {
            lat: o.request.latitude != null ? Number(o.request.latitude) : null,
            lng: o.request.longitude != null ? Number(o.request.longitude) : null,
            address: o.request.address ?? null,
          });
        }
      }
    }

    return activeTrips.map((t) => {
      const enrollmentIdsForThisTrip = junctions
        .filter((j) => j.tripId === t.id)
        .map((j) => j.enrollmentId);
      const myEnrollments = enrollmentIdsForThisTrip
        .map((eid) => enrollmentMap.get(eid))
        .filter((e): e is Enrollment => !!e);
      // Ev konumu için ilk enrollment'ın offer'ından request lat/lng çek
      const firstEnr = myEnrollments[0];
      const homeInfo = firstEnr?.offerId ? offerRequestMap.get(firstEnr.offerId) : null;
      return {
        id: t.id,
        startedAt: t.startedAt,
        routeName: t.routeName,
        currentLat: t.currentLat ? Number(t.currentLat) : null,
        currentLng: t.currentLng ? Number(t.currentLng) : null,
        locationUpdatedAt: t.locationUpdatedAt,
        homeLat: homeInfo?.lat ?? null,
        homeLng: homeInfo?.lng ?? null,
        homeAddress: homeInfo?.address ?? null,
        provider: { id: t.provider.id, companyName: t.provider.companyName, phone: t.provider.phone },
        vehicle: t.vehicle ? {
          brand: t.vehicle.brand,
          model: t.vehicle.model,
          plate: t.vehicle.plate,
        } : null,
        students: myEnrollments.map((e) => ({ id: e.student.id, name: e.student.name })),
      };
    });
  }
}

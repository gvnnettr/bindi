import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Trip, TripEnrollment, Enrollment, StudentGuardian } from '@servis/db';
import { PushService } from '../push/push.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripEnrollment) private readonly tripEnrollments: Repository<TripEnrollment>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(StudentGuardian) private readonly guardians: Repository<StudentGuardian>,
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
    return { ok: true };
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
      relations: ['student', 'parent'],
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
      enrollments: es.map((e) => ({
        id: e.id,
        student: { id: e.student.id, name: e.student.name },
        parent: { id: e.parent.id, name: e.parent.name },
      })),
    };
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

    return activeTrips.map((t) => {
      const enrollmentIdsForThisTrip = junctions
        .filter((j) => j.tripId === t.id)
        .map((j) => j.enrollmentId);
      const myEnrollments = enrollmentIdsForThisTrip
        .map((eid) => enrollmentMap.get(eid))
        .filter((e): e is Enrollment => !!e);
      return {
        id: t.id,
        startedAt: t.startedAt,
        routeName: t.routeName,
        currentLat: t.currentLat ? Number(t.currentLat) : null,
        currentLng: t.currentLng ? Number(t.currentLng) : null,
        locationUpdatedAt: t.locationUpdatedAt,
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

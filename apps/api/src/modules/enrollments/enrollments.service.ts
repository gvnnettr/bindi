import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import {
  Enrollment,
  Payment,
  Offer,
  ServiceRequest,
  RequestStudent,
  ProviderSubscription,
} from '@servis/db';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';
import { PACKAGE_CODES } from '@servis/shared';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    @InjectRepository(ServiceRequest)
    private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(RequestStudent)
    private readonly reqStudents: Repository<RequestStudent>,
    @InjectRepository(ProviderSubscription)
    private readonly subs: Repository<ProviderSubscription>,
    private readonly notif: NotificationsService,
    private readonly sms: SmsService,
  ) {}

  private async assertTakipActive(providerId: string) {
    const rows = await this.subs.find({
      where: { providerId, packageCode: PACKAGE_CODES.TAKIP },
    });
    const now = new Date();
    const active = rows.some(
      (s) => s.approvedAt && s.endsAt && new Date(s.endsAt) > now,
    );
    if (!active) {
      throw new ForbiddenException(
        'Bu özellik Takip Paketi abonelerine özeldir. Panelden Takip Paketi\'ne yükseltebilirsiniz.',
      );
    }
  }

  async ensureFromSelectedOffer(offerId: string): Promise<Enrollment[]> {
    const existing = await this.enrollments.find({ where: { offerId } });
    if (existing.length > 0) return existing;

    const offer = await this.offers.findOne({
      where: { id: offerId },
      relations: ['request'],
    });
    if (!offer) return [];
    if (offer.status !== 'selected') return [];

    const students = await this.reqStudents.find({
      where: { request: { id: offer.requestId } },
      relations: ['student'],
    });
    if (students.length === 0) return [];

    const created: Enrollment[] = [];
    // Ödeme başlangıcı: bir sonraki ay (mevcut ay için ödeme oluşturulmaz)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startMonth = periodStr(nextMonth);
    for (const rs of students) {
      const e = this.enrollments.create({
        providerId: offer.providerId,
        parentId: offer.request.parentId,
        studentId: rs.student.id,
        vehicleId: offer.vehicleId,
        offerId: students.length === 1 ? offer.id : null,
        monthlyPrice: String(offer.monthlyPrice),
        startMonth,
        status: 'active',
      });
      await this.enrollments.save(e);
      await this.generateInitialPayments(e, 12);
      created.push(e);
    }
    return created;
  }

  private async generateInitialPayments(
    enrollment: Enrollment,
    months: number,
  ) {
    const [y, m] = enrollment.startMonth.split('-').map(Number);
    for (let i = 0; i < months; i++) {
      const d = new Date(y, m - 1 + i, 1);
      const period = periodStr(d);
      const dueDate = new Date(d.getFullYear(), d.getMonth(), 10);
      const exists = await this.payments.findOne({
        where: { enrollmentId: enrollment.id, period },
      });
      if (exists) continue;
      const p = this.payments.create({
        enrollmentId: enrollment.id,
        period,
        amount: enrollment.monthlyPrice,
        dueDate,
        status: 'pending',
      });
      await this.payments.save(p);
    }
  }

  async listByProvider(providerId: string) {
    await this.assertTakipActive(providerId);
    const rows = await this.enrollments.find({
      where: { providerId },
      relations: ['student', 'student.school', 'parent', 'vehicle'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((e) => ({
      id: e.id,
      status: e.status,
      startMonth: e.startMonth,
      endMonth: e.endMonth,
      monthlyPrice: Number(e.monthlyPrice),
      note: e.note,
      createdAt: e.createdAt,
      student: {
        id: e.student.id,
        name: e.student.name,
        class: e.student.class,
        school: e.student.school
          ? {
              id: e.student.school.id,
              name: e.student.school.name,
              city: e.student.school.city,
              district: e.student.school.district,
            }
          : null,
      },
      parent: { id: e.parent.id, name: e.parent.name, phone: e.parent.phone },
      vehicle: e.vehicle
        ? {
            id: e.vehicle.id,
            brand: e.vehicle.brand,
            model: e.vehicle.model,
            plate: e.vehicle.plate,
          }
        : null,
    }));
  }

  async detail(providerId: string, id: string) {
    await this.assertTakipActive(providerId);
    const e = await this.enrollments.findOne({
      where: { id, providerId },
      relations: ['student', 'student.school', 'parent', 'vehicle'],
    });
    if (!e) throw new NotFoundException('Kayıt bulunamadı');
    const payments = await this.payments.find({
      where: { enrollmentId: e.id },
      order: { period: 'ASC' },
    });
    return {
      id: e.id,
      status: e.status,
      startMonth: e.startMonth,
      endMonth: e.endMonth,
      monthlyPrice: Number(e.monthlyPrice),
      note: e.note,
      createdAt: e.createdAt,
      student: {
        id: e.student.id,
        name: e.student.name,
        class: e.student.class,
        school: e.student.school
          ? {
              id: e.student.school.id,
              name: e.student.school.name,
              city: e.student.school.city,
              district: e.student.school.district,
            }
          : null,
      },
      parent: {
        id: e.parent.id,
        name: e.parent.name,
        phone: e.parent.phone,
        email: e.parent.email,
      },
      vehicle: e.vehicle
        ? {
            id: e.vehicle.id,
            brand: e.vehicle.brand,
            model: e.vehicle.model,
            plate: e.vehicle.plate,
            seats: e.vehicle.seats,
          }
        : null,
      payments: payments.map((p) => ({
        id: p.id,
        period: p.period,
        amount: Number(p.amount),
        dueDate: p.dueDate,
        status: p.status,
        receiptUrl: p.receiptUrl,
        parentNote: p.parentNote,
        providerNote: p.providerNote,
        submittedAt: p.submittedAt,
        paidAt: p.paidAt,
      })),
    };
  }

  async update(
    providerId: string,
    id: string,
    input: { note?: string; monthlyPrice?: number; vehicleId?: string | null; startMonth?: string },
  ) {
    const e = await this.enrollments.findOne({ where: { id, providerId } });
    if (!e) throw new NotFoundException();
    if (input.note !== undefined) e.note = input.note;
    if (input.vehicleId !== undefined) e.vehicleId = input.vehicleId;
    if (input.monthlyPrice !== undefined) {
      if (input.monthlyPrice <= 0)
        throw new BadRequestException('Fiyat geçersiz');
      e.monthlyPrice = String(input.monthlyPrice);
    }
    // Başlangıç ayı değişirse eski ödemeleri (henüz üretilmiş) sil, yenisini üret
    let regeneratePayments = false;
    if (input.startMonth !== undefined && input.startMonth !== e.startMonth) {
      // Geçmişte değişiklik yapmayı kısıtla — sadece cari ay ve sonrası izin
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (input.startMonth < currentPeriod) {
        throw new BadRequestException('Başlangıç ayı geçmiş bir tarih olamaz');
      }
      e.startMonth = input.startMonth;
      regeneratePayments = true;
    }
    await this.enrollments.save(e);
    if (regeneratePayments) {
      // Sadece daha önce oluşturulmuş "pending" ödemeleri sil (paid/submitted kalır)
      await this.payments.delete({ enrollmentId: e.id, status: 'pending' });
      await this.generateInitialPayments(e, 12);
    }
    return { ok: true };
  }

  async end(providerId: string, id: string) {
    const e = await this.enrollments.findOne({ where: { id, providerId } });
    if (!e) throw new NotFoundException();
    e.status = 'ended';
    e.endMonth = periodStr(new Date());
    await this.enrollments.save(e);
    return { ok: true };
  }

  async providerRevenueReport(providerId: string) {
    await this.assertTakipActive(providerId);
    const enrollments = await this.enrollments.find({
      where: { providerId },
    });
    const activeStudents = enrollments.filter((e) => e.status === 'active').length;
    if (enrollments.length === 0) {
      return {
        activeStudents: 0,
        monthly: [],
        totals: {
          currentMonthCollected: 0,
          currentMonthPending: 0,
          currentMonthLate: 0,
          last12MonthsCollected: 0,
          allTimeCollected: 0,
        },
      };
    }
    const enrIds = enrollments.map((e) => e.id);
    const payments = await this.payments
      .createQueryBuilder('p')
      .where('p.enrollment_id IN (:...ids)', { ids: enrIds })
      .getMany();

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentMonth = periodStr(now);

    // Son 12 ay için ay bazlı özet
    const months: { period: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ period: periodStr(d), label: monthLabel(d) });
    }
    const monthly = months.map((m) => {
      const inPeriod = payments.filter((p) => p.period === m.period);
      const paid = inPeriod
        .filter((p) => p.status === 'paid')
        .reduce((s, p) => s + Number(p.amount), 0);
      const pending = inPeriod
        .filter((p) => p.status === 'pending' || p.status === 'submitted')
        .reduce((s, p) => s + Number(p.amount), 0);
      const late = inPeriod
        .filter((p) => p.status === 'late')
        .reduce((s, p) => s + Number(p.amount), 0);
      const expected = inPeriod.reduce((s, p) => s + Number(p.amount), 0);
      return {
        period: m.period,
        label: m.label,
        paid,
        pending,
        late,
        expected,
      };
    });

    const currentMonthRow =
      monthly.find((r) => r.period === currentMonth) ?? {
        paid: 0,
        pending: 0,
        late: 0,
      };
    const last12Collected = monthly.reduce((s, r) => s + r.paid, 0);
    const allTimeCollected = payments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      activeStudents,
      monthly,
      totals: {
        currentMonthCollected: currentMonthRow.paid,
        currentMonthPending: currentMonthRow.pending,
        currentMonthLate: currentMonthRow.late,
        last12MonthsCollected: last12Collected,
        allTimeCollected,
      },
    };
  }

  async listAllPaymentsForProvider(providerId: string) {
    await this.assertTakipActive(providerId);
    const enrollments = await this.enrollments.find({
      where: { providerId },
      relations: ['student', 'parent'],
    });
    if (enrollments.length === 0) return [];
    const enrIds = enrollments.map((e) => e.id);
    const payments = await this.payments
      .createQueryBuilder('p')
      .where('p.enrollment_id IN (:...ids)', { ids: enrIds })
      .orderBy('p.due_date', 'ASC')
      .getMany();
    const enrById = new Map(enrollments.map((e) => [e.id, e]));
    return payments.map((p) => {
      const e = enrById.get(p.enrollmentId)!;
      return {
        id: p.id,
        enrollmentId: p.enrollmentId,
        period: p.period,
        amount: Number(p.amount),
        dueDate: p.dueDate,
        status: p.status,
        receiptUrl: p.receiptUrl,
        parentNote: p.parentNote,
        providerNote: p.providerNote,
        submittedAt: p.submittedAt,
        paidAt: p.paidAt,
        student: { id: e.student.id, name: e.student.name },
        parent: { id: e.parent.id, name: e.parent.name, phone: e.parent.phone },
      };
    });
  }

  async setPaymentStatusByProvider(
    providerId: string,
    paymentId: string,
    input: { status: 'paid' | 'pending' | 'cancelled'; providerNote?: string },
  ) {
    const payment = await this.payments.findOne({
      where: { id: paymentId },
      relations: ['enrollment'],
    });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı');
    if (payment.enrollment.providerId !== providerId)
      throw new NotFoundException('Ödeme bulunamadı');
    const previousStatus = payment.status;
    payment.status = input.status;
    if (input.status === 'paid' && !payment.paidAt) payment.paidAt = new Date();
    if (input.status !== 'paid') payment.paidAt = null;
    if (input.providerNote !== undefined) payment.providerNote = input.providerNote || null;
    await this.payments.save(payment);

    // Veliye bildirim (dekont onay/red durumlarında)
    try {
      if (previousStatus === 'submitted' || previousStatus === 'pending') {
        if (input.status === 'paid') {
          await this.notif.create({
            role: 'parent',
            recipientId: payment.enrollment.parentId,
            type: 'payment.approved',
            title: 'Ödemeniz onaylandı ✅',
            body: `${payment.period} dönemi ${Number(payment.amount)}₺ ödemesi servisçi tarafından onaylandı.`,
            link: `/veli/odemelerim`,
          });
        } else if (input.status === 'pending' && input.providerNote) {
          await this.notif.create({
            role: 'parent',
            recipientId: payment.enrollment.parentId,
            type: 'payment.rejected',
            title: 'Dekont reddedildi ⚠️',
            body: `${payment.period} ödemesi: ${input.providerNote}. Lütfen yeni dekont yükleyin.`,
            link: `/veli/odemelerim`,
          });
        }
      }
    } catch {
      // bildirim başarısız olsa da işlem tamam
    }

    return { ok: true };
  }

  /**
   * Servisçinin veliye ödeme hatırlatma göndermesi.
   * Rate limit: son 24 saat içinde hatırlatma varsa hata döner.
   * Push + SMS gönderir.
   */
  async remindPaymentByProvider(providerId: string, paymentId: string) {
    const payment = await this.payments.findOne({
      where: { id: paymentId },
      relations: ['enrollment', 'enrollment.parent', 'enrollment.provider', 'enrollment.student'],
    });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı');
    if (payment.enrollment.providerId !== providerId)
      throw new NotFoundException('Ödeme bulunamadı');
    if (payment.status === 'paid') {
      throw new BadRequestException('Bu ödeme zaten ödendi, hatırlatmaya gerek yok');
    }

    // Rate limit: 24 saat
    if (payment.lastReminderAt) {
      const hoursSince = (Date.now() - payment.lastReminderAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const remaining = Math.ceil(24 - hoursSince);
        throw new BadRequestException(
          `Son hatırlatma ${Math.floor(hoursSince)} saat önce gönderildi. ${remaining} saat sonra tekrar hatırlatabilirsin.`,
        );
      }
    }

    const parent = payment.enrollment.parent;
    const provider = payment.enrollment.provider;
    const student = payment.enrollment.student;
    const amountStr = Number(payment.amount).toLocaleString('tr-TR');

    // Push
    try {
      await this.notif.create({
        role: 'parent',
        recipientId: parent.id,
        type: 'payment.reminder',
        title: 'Ödeme hatırlatması ⏰',
        body: `${provider.companyName}: ${student.name} · ${payment.period} dönemi ${amountStr}₺ ödemesi bekleniyor.`,
        link: `/veli/odemelerim`,
      });
    } catch {}

    // SMS
    try {
      await this.sms.send(
        parent.phone,
        `${provider.companyName}: ${student.name} icin ${payment.period} donemi ${amountStr}TL odemesi bekleniyor. Bindi uygulamasindan dekont yukleyebilirsiniz.`,
      );
    } catch {}

    payment.lastReminderAt = new Date();
    await this.payments.save(payment);

    return { ok: true, remindedAt: payment.lastReminderAt };
  }

  // ---- Veli tarafı ----

  async listForParent(parentId: string) {
    const enrollments = await this.enrollments.find({
      where: { parentId },
      relations: ['student', 'provider', 'vehicle'],
    });
    if (enrollments.length === 0) return [];
    const enrIds = enrollments.map((e) => e.id);
    const payments = await this.payments
      .createQueryBuilder('p')
      .where('p.enrollment_id IN (:...ids)', { ids: enrIds })
      .orderBy('p.due_date', 'ASC')
      .getMany();
    const enrById = new Map(enrollments.map((e) => [e.id, e]));
    return payments.map((p) => {
      const e = enrById.get(p.enrollmentId)!;
      return {
        id: p.id,
        enrollmentId: p.enrollmentId,
        period: p.period,
        amount: Number(p.amount),
        dueDate: p.dueDate,
        status: p.status,
        receiptUrl: p.receiptUrl,
        parentNote: p.parentNote,
        providerNote: p.providerNote,
        submittedAt: p.submittedAt,
        paidAt: p.paidAt,
        student: { id: e.student.id, name: e.student.name },
        provider: {
          id: e.provider.id,
          companyName: e.provider.companyName,
          phone: e.provider.phone,
        },
      };
    });
  }

  async submitReceiptByParent(
    parentId: string,
    paymentId: string,
    input: { receiptUrl: string; parentNote?: string },
  ) {
    const payment = await this.payments.findOne({
      where: { id: paymentId },
      relations: ['enrollment'],
    });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı');
    if (payment.enrollment.parentId !== parentId)
      throw new NotFoundException('Ödeme bulunamadı');
    payment.receiptUrl = input.receiptUrl;
    payment.parentNote = input.parentNote ?? null;
    payment.submittedAt = new Date();
    payment.status = 'submitted';
    await this.payments.save(payment);

    await this.notif.create({
      role: 'provider',
      recipientId: payment.enrollment.providerId,
      type: 'payment.receipt_submitted',
      title: 'Dekont yüklendi',
      body: `${payment.period} dönemi için dekont geldi.`,
      link: '/servisci/odemeler',
    });
    return { ok: true };
  }
}

function periodStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabel(d: Date): string {
  const names = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
  ];
  return `${names[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

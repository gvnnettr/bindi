import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, In } from 'typeorm';
import { Payment, Enrollment, Parent, Provider } from '@servis/db';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';

// Kalan gün eşikleri (negatif = geçmiş, pozitif = ileride)
const REMINDER_DAYS = [3, 0, -1, -7]; // 3 gün önce, gün, 1 gün gecikmede, 7 gün gecikmede

@Injectable()
export class PaymentReminderService {
  private readonly logger = new Logger(PaymentReminderService.name);

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    private readonly notif: NotificationsService,
    private readonly sms: SmsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDaily() {
    await this.markLateOverdue();
    await this.sendReminders();
  }

  /**
   * dueDate geçmiş ve status pending olan ödemeleri 'late' işaretle.
   */
  async markLateOverdue(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const res = await this.payments
      .createQueryBuilder()
      .update()
      .set({ status: 'late' })
      .where('status = :pending', { pending: 'pending' })
      .andWhere('due_date < :today', { today })
      .execute();
    this.logger.log(
      `[Late Sweep] Marked ${res.affected ?? 0} pending payments as late`,
    );
    return res.affected ?? 0;
  }

  /**
   * 3 gün önce / bugün / 1 gün geçti / 7 gün geçti — hatırlatma SMS ve bildirim.
   */
  async sendReminders(): Promise<{ sent: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startWindow = new Date(today.getTime() - 30 * 86400000);
    const endWindow = new Date(today.getTime() + 30 * 86400000);
    const candidates = await this.payments
      .createQueryBuilder('p')
      .where('p.status IN (:...st)', { st: ['pending', 'late'] })
      .andWhere('p.due_date BETWEEN :s AND :e', { s: startWindow, e: endWindow })
      .getMany();

    let sent = 0;
    for (const p of candidates) {
      const due = new Date(p.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysLeft = Math.round(
        (due.getTime() - today.getTime()) / 86400000,
      );
      // REMINDER_DAYS: [3,0,-1,-7] — negatif = geçti
      if (!REMINDER_DAYS.includes(daysLeft)) continue;
      // Aynı gün 2 kez atmasın
      if (
        p.lastReminderAt &&
        Date.now() - new Date(p.lastReminderAt).getTime() < 12 * 3600 * 1000
      ) {
        continue;
      }
      const enrollment = await this.enrollments.findOne({
        where: { id: p.enrollmentId },
      });
      if (!enrollment) continue;
      const parent = await this.parents.findOne({ where: { id: enrollment.parentId } });
      const provider = await this.providers.findOne({ where: { id: enrollment.providerId } });
      if (!parent) continue;

      const periodStr = formatPeriod(p.period);
      const amount = Number(p.amount).toLocaleString('tr-TR');
      let title = '';
      let body = '';
      let smsBody = '';
      if (daysLeft === 3) {
        title = `${periodStr} ödemesi 3 gün sonra`;
        body = `${amount} ₺ — ${provider?.companyName ?? 'Servisçi'} ödemesini yaklaşıyor.`;
        smsBody = `Bindi: ${periodStr} servis ücreti (${amount} TL) icin son 3 gun. Panelden dekontu yukleyin: bindi.com.tr/veli/odemeler`;
      } else if (daysLeft === 0) {
        title = `${periodStr} ödeme bugün`;
        body = `Bugün son gün — ${amount} ₺ ödemenizi tamamlayın.`;
        smsBody = `Bindi: ${periodStr} servis ucreti (${amount} TL) icin BUGUN son gun. bindi.com.tr/veli/odemeler`;
      } else if (daysLeft === -1) {
        title = `${periodStr} ödeme gecikti`;
        body = `${amount} ₺ ödemeniz 1 gün gecikti. Servisçinizle iletişime geçin.`;
        smsBody = `Bindi: ${periodStr} servis ucreti (${amount} TL) 1 gun gecikti. bindi.com.tr/veli/odemeler`;
      } else if (daysLeft === -7) {
        title = `${periodStr} ödeme 7 gündür ödenmedi`;
        body = `Servisçiniz sizinle iletişime geçebilir. Lütfen ödemenizi yapın.`;
        smsBody = `Bindi: ${periodStr} servis ucreti 7 gundur odenmedi. Lutfen odeme yapin.`;
      }

      await this.notif.create({
        role: 'parent',
        recipientId: parent.id,
        type: 'payment.reminder',
        title,
        body,
        link: '/veli/odemeler',
      });
      if (parent.phone) {
        try {
          await this.sms.send(parent.phone, smsBody);
        } catch (e) {
          this.logger.warn(
            `Payment SMS to ${parent.phone} failed: ${(e as Error).message}`,
          );
        }
      }
      // Servisçiye özet (7 gün gecikmede)
      if (daysLeft === -7 && provider) {
        await this.notif.create({
          role: 'provider',
          recipientId: provider.id,
          type: 'payment.overdue',
          title: `${parent.name} — ${periodStr} 7 gün gecikti`,
          body: `${amount} ₺ tahsil edilmedi. Panelden takip edin.`,
          link: '/servisci/odemeler',
        });
      }
      p.lastReminderAt = new Date();
      await this.payments.save(p);
      sent++;
    }
    this.logger.log(`[Payment Reminders] Sent ${sent} reminders`);
    return { sent };
  }
}

function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const names = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];
  return `${names[Number(m) - 1]} ${y}`;
}

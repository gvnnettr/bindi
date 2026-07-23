import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { VehicleDocument, Vehicle, Provider } from '@servis/db';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';

const REMINDER_DAYS = [30, 15, 7, 1];

@Injectable()
export class DocumentExpiryService implements OnModuleInit {
  private readonly logger = new Logger(DocumentExpiryService.name);

  constructor(
    @InjectRepository(VehicleDocument)
    private readonly docs: Repository<VehicleDocument>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    private readonly notif: NotificationsService,
    private readonly sms: SmsService,
  ) {}

  onModuleInit() {
    this.logger.log('Document expiry service initialized');
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDailyCheck() {
    await this.checkExpiries();
  }

  async checkExpiries(): Promise<{ checked: number; notified: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = await this.docs
      .createQueryBuilder('d')
      .where('d.expires_at IS NOT NULL')
      .andWhere('d.expires_at >= :today', { today })
      .getMany();

    const expired = await this.docs
      .createQueryBuilder('d')
      .where('d.expires_at IS NOT NULL')
      .andWhere('d.expires_at < :today', { today })
      .andWhere(
        '(d.last_reminder_at IS NULL OR d.last_reminder_at < :recent)',
        {
          recent: new Date(Date.now() - 7 * 86400000),
        },
      )
      .getMany();

    let notified = 0;
    for (const doc of upcoming) {
      const days = Math.ceil(
        (new Date(doc.expiresAt!).getTime() - today.getTime()) / 86400000,
      );
      if (!REMINDER_DAYS.includes(days)) continue;
      const already =
        doc.lastReminderAt &&
        Date.now() - new Date(doc.lastReminderAt).getTime() < 12 * 3600 * 1000;
      if (already) continue;
      await this.notifyDoc(doc, days, 'upcoming');
      notified++;
    }
    for (const doc of expired) {
      await this.notifyDoc(doc, 0, 'expired');
      notified++;
    }

    this.logger.log(
      `Document expiry check: ${upcoming.length + expired.length} scanned, ${notified} notifications sent`,
    );
    return { checked: upcoming.length + expired.length, notified };
  }

  private async notifyDoc(
    doc: VehicleDocument,
    days: number,
    kind: 'upcoming' | 'expired',
  ) {
    const vehicle = await this.vehicles.findOne({ where: { id: doc.vehicleId } });
    if (!vehicle) return;
    const provider = await this.providers.findOne({
      where: { id: vehicle.providerId },
    });
    if (!provider) return;

    const typeLabel: Record<string, string> = {
      ruhsat: 'Ruhsat',
      muayene: 'Muayene',
      sigorta: 'Sigorta',
      k_belgesi: 'K Belgesi',
      diger: 'Belge',
    };
    const t = doc.type ? (typeLabel[doc.type] ?? doc.type) : 'Belge';
    const plate = vehicle.plate;

    const title =
      kind === 'expired'
        ? `${t} süresi doldu — ${plate}`
        : `${t} bitişine ${days} gün — ${plate}`;
    const body =
      kind === 'expired'
        ? `${plate} plakalı aracınızın ${t.toLowerCase()} süresi doldu. Panelden güncelleyin.`
        : `${plate} plakalı aracınızın ${t.toLowerCase()} bitişine ${days} gün kaldı.`;

    await this.notif.create({
      role: 'provider',
      recipientId: provider.id,
      type: 'vehicle.doc_expiry',
      title,
      body,
      link: `/servisci/araclar/${vehicle.id}`,
    });

    if (provider.phone) {
      try {
        await this.sms.send(
          provider.phone,
          kind === 'expired'
            ? `Bindi: ${plate} aracınızın ${t.toLowerCase()} süresi doldu. Panelden güncelleyin.`
            : `Bindi: ${plate} aracınızın ${t.toLowerCase()} bitişine ${days} gün kaldı.`,
        );
      } catch (e) {
        this.logger.warn(`SMS send failed for ${provider.id}: ${(e as Error).message}`);
      }
    }

    doc.lastReminderAt = new Date();
    await this.docs.save(doc);
  }
}

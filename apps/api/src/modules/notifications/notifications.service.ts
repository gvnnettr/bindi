import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '@servis/db';
import { PushService } from '../push/push.service';

export type NotificationRole = 'parent' | 'provider' | 'admin';

export interface CreateNotificationInput {
  role: NotificationRole;
  recipientId?: string | null; // admin için null
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @Optional() private readonly push?: PushService,
  ) {}

  private firePush(input: CreateNotificationInput) {
    if (!this.push) return;
    this.push
      .sendToRecipient(input.role, input.recipientId ?? null, {
        title: input.title,
        body: input.body ?? '',
        url: input.link ?? '/',
        tag: input.type,
      })
      .catch(() => {});
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    const n = this.repo.create({
      recipientRole: input.role,
      recipientId: input.recipientId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    });
    const saved = await this.repo.save(n);
    this.firePush(input);
    return saved;
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    const entities = inputs.map((i) =>
      this.repo.create({
        recipientRole: i.role,
        recipientId: i.recipientId ?? null,
        type: i.type,
        title: i.title,
        body: i.body ?? null,
        link: i.link ?? null,
      }),
    );
    await this.repo.save(entities);
    for (const i of inputs) this.firePush(i);
  }

  async list(role: NotificationRole, recipientId: string | null, limit = 30) {
    return this.repo
      .createQueryBuilder('n')
      .where('n.recipient_role = :role', { role })
      .andWhere(
        recipientId
          ? '(n.recipient_id = :rid OR n.recipient_id IS NULL)'
          : 'n.recipient_id IS NULL',
        recipientId ? { rid: recipientId } : {},
      )
      .orderBy('n.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  async unreadCount(role: NotificationRole, recipientId: string | null): Promise<number> {
    return this.repo
      .createQueryBuilder('n')
      .where('n.recipient_role = :role', { role })
      .andWhere(
        recipientId
          ? '(n.recipient_id = :rid OR n.recipient_id IS NULL)'
          : 'n.recipient_id IS NULL',
        recipientId ? { rid: recipientId } : {},
      )
      .andWhere('n.read_at IS NULL')
      .getCount();
  }

  async markRead(id: string) {
    await this.repo.update({ id, readAt: IsNull() }, { readAt: new Date() });
    return { ok: true };
  }

  async markAllRead(role: NotificationRole, recipientId: string | null) {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('recipient_role = :role', { role })
      .andWhere(
        recipientId
          ? '(recipient_id = :rid OR recipient_id IS NULL)'
          : 'recipient_id IS NULL',
        recipientId ? { rid: recipientId } : {},
      )
      .andWhere('read_at IS NULL')
      .execute();
    return { ok: true };
  }
}

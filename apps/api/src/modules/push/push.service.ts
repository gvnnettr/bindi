import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import * as fs from 'node:fs';
import * as admin from 'firebase-admin';
import { MobilePushToken, PushSubscription } from '@servis/db';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private webConfigured = false;
  private fcmConfigured = false;
  private fcmApp: admin.app.App | null = null;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subs: Repository<PushSubscription>,
    @InjectRepository(MobilePushToken)
    private readonly tokens: Repository<MobilePushToken>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC');
    const privateKey = this.config.get<string>('VAPID_PRIVATE');
    const contact =
      this.config.get<string>('VAPID_CONTACT') || 'mailto:destek@bindi.com.tr';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(contact, publicKey, privateKey);
      this.webConfigured = true;
      this.logger.log('Web push configured with VAPID');
    } else {
      this.logger.warn('VAPID keys not set — web push disabled');
    }

    const credPath =
      this.config.get<string>('FIREBASE_ADMIN_CREDENTIAL_PATH') ||
      '/var/www/servis-platform/.firebase-admin.json';
    if (fs.existsSync(credPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        this.fcmApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        }, 'bindi-fcm');
        this.fcmConfigured = true;
        this.logger.log('FCM configured with service account');
      } catch (e) {
        this.logger.error(
          `FCM init failed: ${(e as Error).message} — mobile push disabled`,
        );
      }
    } else {
      this.logger.warn(
        `FCM credential file not found at ${credPath} — mobile push disabled`,
      );
    }
  }

  publicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC') ?? null;
  }

  async subscribe(
    role: 'provider' | 'parent' | 'admin',
    recipientId: string | null,
    input: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    },
  ) {
    let sub = await this.subs.findOne({ where: { endpoint: input.endpoint } });
    if (sub) {
      sub.role = role;
      sub.recipientId = recipientId;
      sub.p256dh = input.keys.p256dh;
      sub.auth = input.keys.auth;
      sub.userAgent = input.userAgent ?? null;
    } else {
      sub = this.subs.create({
        role,
        recipientId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      });
    }
    await this.subs.save(sub);
    return { ok: true };
  }

  async unsubscribe(endpoint: string) {
    await this.subs.delete({ endpoint });
    return { ok: true };
  }

  async registerMobileToken(
    role: 'provider' | 'parent' | 'admin',
    recipientId: string | null,
    input: {
      token: string;
      platform: 'ios' | 'android';
      deviceId?: string;
      appVersion?: string;
    },
  ) {
    let row = await this.tokens.findOne({ where: { token: input.token } });
    if (row) {
      row.role = role;
      row.recipientId = recipientId;
      row.platform = input.platform;
      row.deviceId = input.deviceId ?? null;
      row.appVersion = input.appVersion ?? null;
    } else {
      row = this.tokens.create({
        role,
        recipientId,
        token: input.token,
        platform: input.platform,
        deviceId: input.deviceId ?? null,
        appVersion: input.appVersion ?? null,
      });
    }
    await this.tokens.save(row);
    return { ok: true };
  }

  async unregisterMobileToken(token: string) {
    await this.tokens.delete({ token });
    return { ok: true };
  }

  async sendToRecipient(
    role: 'provider' | 'parent' | 'admin',
    recipientId: string | null,
    payload: PushPayload,
  ) {
    await Promise.all([
      this.sendWeb(role, recipientId, payload),
      this.sendMobile(role, recipientId, payload),
    ]);
  }

  private async sendWeb(
    role: 'provider' | 'parent' | 'admin',
    recipientId: string | null,
    payload: PushPayload,
  ) {
    if (!this.webConfigured) return;
    const subs =
      recipientId != null
        ? await this.subs.find({ where: { role, recipientId } })
        : await this.subs.find({ where: { role } });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (e: any) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await this.subs.delete({ id: sub.id });
        } else {
          this.logger.warn(
            `Web push failed to ${sub.endpoint.slice(0, 40)}…: ${e.message}`,
          );
        }
      }
    }
  }

  private async sendMobile(
    role: 'provider' | 'parent' | 'admin',
    recipientId: string | null,
    payload: PushPayload,
  ) {
    if (!this.fcmConfigured || !this.fcmApp) return;
    const rows =
      recipientId != null
        ? await this.tokens.find({ where: { role, recipientId } })
        : await this.tokens.find({ where: { role } });
    if (rows.length === 0) return;

    const messaging = admin.messaging(this.fcmApp);
    const dataPayload: Record<string, string> = {
      ...(payload.data ?? {}),
      ...(payload.url ? { url: payload.url } : {}),
      ...(payload.tag ? { tag: payload.tag } : {}),
    };

    const messages: admin.messaging.Message[] = rows.map((r) => ({
      token: r.token,
      notification: { title: payload.title, body: payload.body },
      data: dataPayload,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }));

    try {
      const resp = await messaging.sendEach(messages);
      const invalidTokens: string[] = [];
      resp.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code ?? '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidTokens.push(rows[idx].token);
          } else {
            this.logger.warn(
              `FCM send failed [${code}]: ${r.error?.message ?? '?'}`,
            );
          }
        }
      });
      if (invalidTokens.length > 0) {
        await this.tokens.delete(invalidTokens.map((t) => ({ token: t })));
      }
    } catch (e) {
      this.logger.error(`FCM batch send failed: ${(e as Error).message}`);
    }
  }
}

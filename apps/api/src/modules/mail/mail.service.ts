import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SettingsService } from '../settings/settings.service';
import { SETTINGS_KEYS } from '@servis/shared';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly settings: SettingsService) {}

  private async buildTransport() {
    const host = await this.settings.get(SETTINGS_KEYS.MAIL_SMTP_HOST);
    const port = Number(await this.settings.get(SETTINGS_KEYS.MAIL_SMTP_PORT));
    const user = await this.settings.get(SETTINGS_KEYS.MAIL_SMTP_USER);
    const pass = await this.settings.get(SETTINGS_KEYS.MAIL_SMTP_PASS);
    const secure = await this.settings.getBool(SETTINGS_KEYS.MAIL_SMTP_SECURE);
    if (!host || !port) throw new Error('SMTP yapılandırması eksik');
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    const enabled = await this.settings.getBool(SETTINGS_KEYS.MAIL_ENABLED);
    const testMode = await this.settings.getBool(SETTINGS_KEYS.MAIL_TEST_MODE);
    if (!enabled || testMode) {
      this.logger.log(`[TEST MAIL] to=${to} subject="${subject}"`);
      return;
    }
    const transport = await this.buildTransport();
    const fromAddr = await this.settings.get(SETTINGS_KEYS.MAIL_FROM_ADDRESS);
    const fromName = await this.settings.get(SETTINGS_KEYS.MAIL_FROM_NAME);
    const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr;
    await transport.sendMail({
      from,
      to,
      subject,
      text: text ?? subject,
      html,
    });
    this.logger.log(`Mail sent to ${to}`);
  }

  async sendTest(to: string): Promise<void> {
    const enabled = await this.settings.getBool(SETTINGS_KEYS.MAIL_ENABLED);
    const testMode = await this.settings.getBool(SETTINGS_KEYS.MAIL_TEST_MODE);
    if (!enabled) {
      throw new Error('Mail sistemi aktif değil. Ayarlardan aktifleştirin ve KAYDETİN.');
    }
    if (testMode) {
      throw new Error(
        'Test modu açık — gerçek mail gönderilmez. Test göndermek için test modunu kapatın.',
      );
    }
    // Doğrudan gerçek gönder (send() içindeki test-mode kontrolünü atla)
    const transport = await this.buildTransport();
    const fromAddr = await this.settings.get(SETTINGS_KEYS.MAIL_FROM_ADDRESS);
    const fromName = await this.settings.get(SETTINGS_KEYS.MAIL_FROM_NAME);
    const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr;
    await transport.sendMail({
      from,
      to,
      subject: 'Servis Platform — Test E-postası',
      html: `<p>Bu bir test e-postasıdır. Gönderim tarihi: <b>${new Date().toLocaleString('tr-TR')}</b></p>`,
      text: 'Test e-postası',
    });
  }
}

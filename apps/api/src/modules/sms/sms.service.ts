import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { SETTINGS_KEYS } from '@servis/shared';
import { sendViaNetgsm } from './netgsm.provider';

// (SMS_ENABLED false veya testMode true = test mode, SMS gönderilmez)

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly settings: SettingsService) {}

  async isTestMode(): Promise<boolean> {
    const enabled = await this.settings.getBool(SETTINGS_KEYS.SMS_ENABLED);
    const testMode = await this.settings.getBool(SETTINGS_KEYS.SMS_TEST_MODE);
    const provider = await this.settings.get(SETTINGS_KEYS.SMS_PROVIDER);
    return !enabled || testMode || provider === 'stub' || !provider;
  }

  async send(phone: string, message: string): Promise<void> {
    const enabled = await this.settings.getBool(SETTINGS_KEYS.SMS_ENABLED);
    const testMode = await this.settings.getBool(SETTINGS_KEYS.SMS_TEST_MODE);
    const provider = await this.settings.get(SETTINGS_KEYS.SMS_PROVIDER);
    const isTest = !enabled || testMode || provider === 'stub' || !provider;
    this.logger.log(
      `[SMS Check] enabled=${enabled} testMode=${testMode} provider=${provider} isTest=${isTest} phone=${phone}`,
    );
    if (isTest) {
      this.logger.log(`[TEST SMS] to=${phone} msg="${message}"`);
      return;
    }

    if (provider === 'netgsm') {
      const user = await this.settings.get(SETTINGS_KEYS.SMS_NETGSM_USER);
      const pass = await this.settings.get(SETTINGS_KEYS.SMS_NETGSM_PASS);
      const header = await this.settings.get(SETTINGS_KEYS.SMS_NETGSM_HEADER);
      if (!user || !pass || !header) {
        this.logger.warn('Netgsm eksik yapılandırma, stub\'a düşülüyor');
        this.logger.log(`[STUB SMS] to=${phone} msg="${message}"`);
        return;
      }
      try {
        await sendViaNetgsm({ user, pass, header }, phone, message);
        this.logger.log(`[REAL SMS OK] to=${phone}`);
      } catch (e) {
        this.logger.error(
          `[REAL SMS FAILED] to=${phone} error=${(e as Error).message}`,
        );
        throw e;
      }
      return;
    }

    throw new Error(`Bilinmeyen SMS sağlayıcı: ${provider}`);
  }

  async sendTest(phone: string): Promise<{ ok: boolean; provider: string; note?: string }> {
    const enabled = await this.settings.getBool(SETTINGS_KEYS.SMS_ENABLED);
    const testMode = await this.settings.getBool(SETTINGS_KEYS.SMS_TEST_MODE);
    if (!enabled) throw new Error('SMS aktif değil. Ayarlardan aktifleştirin ve KAYDETİN.');
    if (testMode)
      throw new Error(
        'Test modu açık — gerçek SMS gönderilmez. Test göndermek için test modunu kapatın.',
      );
    const provider = await this.settings.get(SETTINGS_KEYS.SMS_PROVIDER);
    if (provider === 'netgsm') {
      const user = await this.settings.get(SETTINGS_KEYS.SMS_NETGSM_USER);
      const pass = await this.settings.get(SETTINGS_KEYS.SMS_NETGSM_PASS);
      const header = await this.settings.get(SETTINGS_KEYS.SMS_NETGSM_HEADER);
      if (!user || !pass || !header)
        throw new Error('Netgsm eksik yapılandırma. Kullanıcı/şifre/başlık dolu olmalı.');
      await sendViaNetgsm({ user, pass, header }, phone, `Servis Platform test SMS - ${new Date().toLocaleString('tr-TR')}`);
    }
    return { ok: true, provider };
  }
}

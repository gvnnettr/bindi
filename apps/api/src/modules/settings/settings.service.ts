import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '@servis/db';
import { SETTINGS_KEYS, SettingsKey, SETTINGS_SECRETS } from '@servis/shared';

const DEFAULTS: Record<SettingsKey, string> = {
  [SETTINGS_KEYS.SITE_NAME]: 'Servis Platform',
  [SETTINGS_KEYS.SITE_TAGLINE]: 'Okul Servisi Teklif Sistemi',
  [SETTINGS_KEYS.SITE_SUPPORT_EMAIL]: '',
  [SETTINGS_KEYS.SITE_SUPPORT_PHONE]: '',
  [SETTINGS_KEYS.SITE_ADDRESS]: '',
  [SETTINGS_KEYS.SITE_LOGO_HEADER_URL]: '',
  [SETTINGS_KEYS.SITE_LOGO_FOOTER_URL]: '',

  [SETTINGS_KEYS.SMS_ENABLED]: 'false',
  [SETTINGS_KEYS.SMS_TEST_MODE]: 'false',
  [SETTINGS_KEYS.SMS_PROVIDER]: 'stub',
  [SETTINGS_KEYS.SMS_NETGSM_USER]: '',
  [SETTINGS_KEYS.SMS_NETGSM_PASS]: '',
  [SETTINGS_KEYS.SMS_NETGSM_HEADER]: '',

  [SETTINGS_KEYS.MAIL_ENABLED]: 'false',
  [SETTINGS_KEYS.MAIL_TEST_MODE]: 'false',
  [SETTINGS_KEYS.MAIL_SMTP_HOST]: '',
  [SETTINGS_KEYS.MAIL_SMTP_PORT]: '587',
  [SETTINGS_KEYS.MAIL_SMTP_USER]: '',
  [SETTINGS_KEYS.MAIL_SMTP_PASS]: '',
  [SETTINGS_KEYS.MAIL_SMTP_SECURE]: 'false',
  [SETTINGS_KEYS.MAIL_FROM_ADDRESS]: '',
  [SETTINGS_KEYS.MAIL_FROM_NAME]: 'Servis Platform',

  [SETTINGS_KEYS.BANK_NAME]: '',
  [SETTINGS_KEYS.BANK_HOLDER]: '',
  [SETTINGS_KEYS.BANK_IBAN]: '',
  [SETTINGS_KEYS.BANK_NOTE_TEMPLATE]: 'Firma ünvanınızı açıklama olarak yazın.',

  [SETTINGS_KEYS.OFFER_MIN_PRICE_PER_KM]: '', // Boş = devre dışı
};

// Env → default map (env değeri varsa DB default'unu ez)
const ENV_MAP: Partial<Record<SettingsKey, string>> = {
  [SETTINGS_KEYS.SMS_PROVIDER]: 'SMS_PROVIDER',
  [SETTINGS_KEYS.SMS_NETGSM_USER]: 'NETGSM_USER',
  [SETTINGS_KEYS.SMS_NETGSM_PASS]: 'NETGSM_PASS',
  [SETTINGS_KEYS.SMS_NETGSM_HEADER]: 'NETGSM_HEADER',
};

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(Setting) private readonly repo: Repository<Setting>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    // Bootstrap defaults + env değerleri (yalnızca DB'de yoksa)
    const existing = await this.repo.find();
    const existingKeys = new Set(existing.map((s) => s.key));
    const rows: Setting[] = [];
    for (const [key, def] of Object.entries(DEFAULTS)) {
      if (existingKeys.has(key)) continue;
      const envVarName = ENV_MAP[key as SettingsKey];
      const envValue = envVarName
        ? (this.config.get<string>(envVarName) ?? process.env[envVarName])
        : undefined;
      const value = envValue !== undefined && envValue !== '' ? envValue : def;
      rows.push(this.repo.create({ key, value }));
    }
    if (rows.length) await this.repo.save(rows);
    // Aktifleştirme sinyali: SMS_PROVIDER netgsm ise ve DB'de sms.enabled hâlâ default false ise, true'ya çek
    const smsProv = await this.get(SETTINGS_KEYS.SMS_PROVIDER);
    if (smsProv === 'netgsm') {
      const enabled = await this.get(SETTINGS_KEYS.SMS_ENABLED);
      if (enabled === 'false') await this.setMany({ [SETTINGS_KEYS.SMS_ENABLED]: 'true' });
    }
    await this.reload();
  }

  async reload() {
    const all = await this.repo.find();
    this.cache = new Map(all.map((s) => [s.key, s.value ?? '']));
  }

  async get(key: SettingsKey | string): Promise<string> {
    if (this.cache.size === 0) await this.reload();
    return this.cache.get(key) ?? '';
  }

  async getBool(key: SettingsKey | string): Promise<boolean> {
    const v = await this.get(key);
    return v === 'true' || v === '1';
  }

  async getAll(includeSecrets = false): Promise<Record<string, string>> {
    await this.reload();
    const out: Record<string, string> = {};
    for (const [k, v] of this.cache.entries()) {
      if (!includeSecrets && SETTINGS_SECRETS.includes(k as SettingsKey)) {
        out[k] = v ? '••••••••' : '';
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  async setMany(updates: Record<string, string>): Promise<void> {
    const rows: Setting[] = [];
    for (const [key, value] of Object.entries(updates)) {
      // Boş şifre gönderilirse mevcut değeri koru (UI'dan boş bırakılınca üzerine yazma)
      if (SETTINGS_SECRETS.includes(key as SettingsKey) && (!value || value === '••••••••')) {
        continue;
      }
      const existing = await this.repo.findOne({ where: { key } });
      if (existing) {
        existing.value = value;
        rows.push(existing);
      } else {
        rows.push(this.repo.create({ key, value }));
      }
    }
    if (rows.length) await this.repo.save(rows);
    await this.reload();
  }
}

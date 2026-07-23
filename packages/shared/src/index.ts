export const PACKAGE_CODES = {
  TEKLIF: 'teklif',
  TAKIP: 'takip',
} as const;
export type PackageCode = (typeof PACKAGE_CODES)[keyof typeof PACKAGE_CODES];

export const PROVIDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;
export type ProviderStatus =
  (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS];

export const REQUEST_STATUS = {
  OPEN: 'open',
  MATCHED: 'matched',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;
export type RequestStatus =
  (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const OFFER_STATUS = {
  PENDING: 'pending',
  SELECTED: 'selected',
  REJECTED: 'rejected',
} as const;
export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

export const OTP_PURPOSE = {
  PARENT_REQUEST: 'parent_request',
  PARENT_LOGIN: 'parent_login',
  PROVIDER_REGISTER: 'provider_register',
  PROVIDER_LOGIN: 'provider_login',
  PROVIDER_FORGOT: 'provider_forgot_password',
  AUTH_PHONE_VERIFY: 'auth_phone_verify', // Unified phone-first auth (veli+servisçi)
} as const;
export type OtpPurpose = (typeof OTP_PURPOSE)[keyof typeof OTP_PURPOSE];

export const PICKUP_TYPE = {
  BOTH: 'both',
  MORNING_ONLY: 'morning_only',
  AFTERNOON_ONLY: 'afternoon_only',
} as const;
export type PickupType = (typeof PICKUP_TYPE)[keyof typeof PICKUP_TYPE];

export const GUARDIAN_RELATIONS = [
  'baba',
  'anne',
  'dede',
  'anneanne',
  'babaanne',
  'amca',
  'dayı',
  'teyze',
  'hala',
  'diğer',
] as const;
export type GuardianRelation = (typeof GUARDIAN_RELATIONS)[number];

// Settings keys (site-wide config)
export const SETTINGS_KEYS = {
  // Site
  SITE_NAME: 'site.name',
  SITE_TAGLINE: 'site.tagline',
  SITE_SUPPORT_EMAIL: 'site.support_email',
  SITE_SUPPORT_PHONE: 'site.support_phone',
  SITE_ADDRESS: 'site.address',
  SITE_LOGO_HEADER_URL: 'site.logo.header_url',
  SITE_LOGO_FOOTER_URL: 'site.logo.footer_url',

  // SMS
  SMS_ENABLED: 'sms.enabled',
  SMS_TEST_MODE: 'sms.test_mode',
  SMS_PROVIDER: 'sms.provider',
  SMS_NETGSM_USER: 'sms.netgsm.user',
  SMS_NETGSM_PASS: 'sms.netgsm.pass',
  SMS_NETGSM_HEADER: 'sms.netgsm.header',

  // Mail (SMTP)
  MAIL_ENABLED: 'mail.enabled',
  MAIL_TEST_MODE: 'mail.test_mode',
  MAIL_SMTP_HOST: 'mail.smtp.host',
  MAIL_SMTP_PORT: 'mail.smtp.port',
  MAIL_SMTP_USER: 'mail.smtp.user',
  MAIL_SMTP_PASS: 'mail.smtp.pass',
  MAIL_SMTP_SECURE: 'mail.smtp.secure',
  MAIL_FROM_ADDRESS: 'mail.from.address',
  MAIL_FROM_NAME: 'mail.from.name',

  // Banka (havale)
  BANK_NAME: 'bank.name',
  BANK_HOLDER: 'bank.holder',
  BANK_IBAN: 'bank.iban',
  BANK_NOTE_TEMPLATE: 'bank.note_template',
} as const;

export type SettingsKey =
  (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export const SETTINGS_SECRETS: SettingsKey[] = [
  SETTINGS_KEYS.SMS_NETGSM_PASS,
  SETTINGS_KEYS.MAIL_SMTP_PASS,
];

export {
  TURKEY_CITIES,
  TURKEY_DISTRICTS,
  TURKEY_NEIGHBORHOODS,
  getDistricts,
  getNeighborhoods,
} from './turkey-data';

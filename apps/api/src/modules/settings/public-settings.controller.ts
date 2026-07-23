import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SETTINGS_KEYS } from '@servis/shared';

@Controller('public-settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('branding')
  async branding() {
    return {
      siteName: await this.settings.get(SETTINGS_KEYS.SITE_NAME),
      siteTagline: await this.settings.get(SETTINGS_KEYS.SITE_TAGLINE),
      logoHeaderUrl: await this.settings.get(SETTINGS_KEYS.SITE_LOGO_HEADER_URL),
      logoFooterUrl: await this.settings.get(SETTINGS_KEYS.SITE_LOGO_FOOTER_URL),
      supportEmail: await this.settings.get(SETTINGS_KEYS.SITE_SUPPORT_EMAIL),
      supportPhone: await this.settings.get(SETTINGS_KEYS.SITE_SUPPORT_PHONE),
      address: await this.settings.get(SETTINGS_KEYS.SITE_ADDRESS),
    };
  }
}

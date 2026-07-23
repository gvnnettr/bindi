import { BadRequestException, Body, Controller, Logger, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MailService } from '../mail/mail.service';
import { MailTemplates } from '../mail/mail-templates';
import { SettingsService } from '../settings/settings.service';
import { SETTINGS_KEYS } from '@servis/shared';

class ContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  message!: string;
}

@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  @Post()
  async submit(@Body() dto: ContactDto) {
    const to =
      (await this.settings.get(SETTINGS_KEYS.SITE_SUPPORT_EMAIL)) ||
      (await this.settings.get(SETTINGS_KEYS.MAIL_FROM_ADDRESS));
    if (!to) {
      this.logger.warn(
        `[İletişim] Hedef e-posta yok — mesaj kaydedildi ama iletilemedi. Ad=${dto.name} email=${dto.email}`,
      );
      throw new BadRequestException(
        'Şu an iletişim formu alınamıyor. Lütfen doğrudan destek@servisplatform.com adresine yazın.',
      );
    }
    const subject = dto.subject
      ? `[İletişim] ${dto.subject}`
      : `[İletişim] ${dto.name} tarafından yeni mesaj`;
    const html = MailTemplates.contactForm({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      subject: dto.subject,
      message: dto.message,
    });
    const text = `Ad: ${dto.name}\nE-posta: ${dto.email}\nTelefon: ${dto.phone ?? '-'}\nKonu: ${dto.subject ?? '-'}\n\nMesaj:\n${dto.message}`;
    try {
      await this.mail.send(to, subject, html, text);
    } catch (e) {
      this.logger.error(`[İletişim] Mail gönderilemedi: ${(e as Error).message}`);
      throw new BadRequestException(
        'Mesaj alındı ancak sistemsel bir hata oluştu. Lütfen tekrar deneyin.',
      );
    }
    return { ok: true };
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

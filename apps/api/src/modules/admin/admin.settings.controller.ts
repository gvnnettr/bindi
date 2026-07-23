import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { IsObject, IsString, Length } from 'class-validator';
import { SettingsService } from '../settings/settings.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
import { AdminJwtGuard } from './admin-jwt.guard';
import { SETTINGS_KEYS } from '@servis/shared';

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || '/var/www/servis-platform/apps/web/public/uploads';

class PatchSettingsDto {
  @IsObject() values!: Record<string, string>;
}

class TestSmsDto {
  @IsString() @Length(10, 20) phone!: string;
}

class TestMailDto {
  @IsString() @Length(3, 200) email!: string;
}

@UseGuards(AdminJwtGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  private readonly logger = new Logger(AdminSettingsController.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly sms: SmsService,
    private readonly mail: MailService,
  ) {}

  @Get()
  async list() {
    return this.settings.getAll(false);
  }

  @Patch()
  async patch(@Body() dto: PatchSettingsDto) {
    await this.settings.setMany(dto.values);
    return this.settings.getAll(false);
  }

  @Post('test-sms')
  async testSms(@Body() dto: TestSmsDto) {
    try {
      const r = await this.sms.sendTest(dto.phone);
      return { ok: r.ok, provider: r.provider };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @Post('test-mail')
  async testMail(@Body() dto: TestMailDto) {
    try {
      await this.mail.sendTest(dto.email);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @Post('logo/:target')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = (path.extname(file.originalname) || '.png').toLowerCase();
          const name = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
        if (!ok.includes(file.mimetype)) {
          cb(new BadRequestException('Sadece PNG/JPEG/WEBP/SVG kabul edilir'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadLogo(
    @Param('target') target: 'header' | 'footer',
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.log(
      `[Logo Upload] target=${target} file=${file?.filename} size=${file?.size} mime=${file?.mimetype}`,
    );
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (target !== 'header' && target !== 'footer')
      throw new BadRequestException('Geçersiz hedef');
    const url = `/uploads/${file.filename}`;
    const key =
      target === 'header'
        ? SETTINGS_KEYS.SITE_LOGO_HEADER_URL
        : SETTINGS_KEYS.SITE_LOGO_FOOTER_URL;
    try {
      await this.settings.setMany({ [key]: url });
      this.logger.log(`[Logo Upload] settings updated ${key}=${url}`);
    } catch (e) {
      this.logger.error(
        `[Logo Upload] settings update FAILED: ${(e as Error).message}`,
        (e as Error).stack,
      );
      throw e;
    }
    return { ok: true, url };
  }

  @Post('logo/:target/clear')
  async clearLogo(@Param('target') target: 'header' | 'footer') {
    if (target !== 'header' && target !== 'footer')
      throw new BadRequestException('Geçersiz hedef');
    const key =
      target === 'header'
        ? SETTINGS_KEYS.SITE_LOGO_HEADER_URL
        : SETTINGS_KEYS.SITE_LOGO_FOOTER_URL;
    await this.settings.setMany({ [key]: '' });
    return { ok: true };
  }
}

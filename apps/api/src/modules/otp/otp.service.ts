import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { OtpRequest } from '@servis/db';
import { SmsService } from '../sms/sms.service';
import { OtpPurpose } from '@servis/shared';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpRequest) private readonly repo: Repository<OtpRequest>,
    private readonly sms: SmsService,
    private readonly jwt: JwtService,
  ) {}

  private hash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    // Türkiye normalizasyonu: 05xxxxxxxxx (11 hane) veya 5xxxxxxxxx
    if (digits.length === 11 && digits.startsWith('0')) return digits;
    if (digits.length === 10 && digits.startsWith('5')) return '0' + digits;
    if (digits.length === 12 && digits.startsWith('90')) return '0' + digits.slice(2);
    throw new BadRequestException('Geçersiz telefon numarası');
  }

  // Play Store + App Store reviewer'ları için whitelist:
  // REVIEWER_PHONES env'inde tanımlı numaralara SMS gitmez, static OTP (REVIEWER_STATIC_OTP,
  // default '000000') kabul edilir. Rate limit de bu numaralar için yok.
  // Güvenlik: env'i sadece prod'da set et, reviewer sonrası kaldır veya döndür.
  private isReviewerPhone(normalizedPhone: string): boolean {
    const raw = process.env.REVIEWER_PHONES;
    if (!raw) return false;
    const list = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        try {
          return this.normalizePhone(p);
        } catch {
          return null;
        }
      })
      .filter((p): p is string => !!p);
    return list.includes(normalizedPhone);
  }

  async send(
    rawPhone: string,
    purpose: OtpPurpose,
  ): Promise<{ phone: string; testCode?: string }> {
    const phone = this.normalizePhone(rawPhone);
    const isReviewer = this.isReviewerPhone(phone);

    // Rate limits reviewer için atlanır — inceleyici hızlı deneyebilmeli
    if (!isReviewer) {
      const oneMinAgo = new Date(Date.now() - 60_000);
      const oneHourAgo = new Date(Date.now() - 3_600_000);
      const lastMin = await this.repo.count({
        where: { phone, purpose, createdAt: MoreThan(oneMinAgo) },
      });
      if (lastMin >= 1) {
        throw new HttpException(
          'Çok sık istek gönderiyorsunuz, lütfen 1 dakika bekleyin.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const lastHour = await this.repo.count({
        where: { phone, purpose, createdAt: MoreThan(oneHourAgo) },
      });
      if (lastHour >= 5) {
        throw new HttpException(
          'Saatlik SMS limitine ulaşıldı, sonra tekrar deneyin.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = isReviewer
      ? (process.env.REVIEWER_STATIC_OTP || '000000')
      : String(Math.floor(100000 + Math.random() * 900000));
    const otp = this.repo.create({
      phone,
      purpose,
      codeHash: this.hash(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    await this.repo.save(otp);

    if (isReviewer) {
      // SMS gitmez, sabit kod verify'da kabul edilir
      this.logger.log(`Reviewer whitelist OTP for ${phone} (${purpose}) — SMS skipped, static code accepted`);
    } else {
      await this.sms.send(phone, `servis-platform doğrulama kodu: ${code}`);
      this.logger.log(`OTP sent to ${phone} for ${purpose}`);
    }
    // Test mod'da kod frontend'e döner (SMS gitmez, ekranda görünür)
    const testMode = await this.sms.isTestMode();
    return testMode ? { phone, testCode: code } : { phone };
  }

  async verify(
    rawPhone: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<{ token: string; phone: string }> {
    const phone = this.normalizePhone(rawPhone);
    const otp = await this.repo.findOne({
      where: { phone, purpose },
      order: { createdAt: 'DESC' },
    });
    if (!otp) throw new BadRequestException('OTP bulunamadı');
    if (otp.consumedAt) throw new BadRequestException('OTP daha önce kullanılmış');
    if (otp.expiresAt.getTime() < Date.now())
      throw new BadRequestException('OTP süresi doldu');
    if (otp.attempts >= MAX_ATTEMPTS)
      throw new BadRequestException('Çok fazla yanlış deneme');

    if (otp.codeHash !== this.hash(code)) {
      otp.attempts += 1;
      await this.repo.save(otp);
      throw new BadRequestException('Kod hatalı');
    }
    otp.consumedAt = new Date();
    await this.repo.save(otp);

    const token = await this.jwt.signAsync({ phone, purpose });
    return { token, phone };
  }

  async verifyToken(
    token: string,
    expectedPurpose: OtpPurpose,
  ): Promise<{ phone: string }> {
    try {
      const payload = await this.jwt.verifyAsync<{
        phone: string;
        purpose: OtpPurpose;
      }>(token);
      if (payload.purpose !== expectedPurpose)
        throw new BadRequestException('Token amacı uyuşmuyor');
      return { phone: payload.phone };
    } catch {
      throw new BadRequestException('Geçersiz veya süresi dolmuş token');
    }
  }
}

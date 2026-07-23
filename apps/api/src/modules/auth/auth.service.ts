import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Parent, Provider } from '@servis/db';
import { OTP_PURPOSE } from '@servis/shared';
import { OtpService } from '../otp/otp.service';

type Role = 'parent' | 'provider';
type PhoneCheckStatus = 'has_password' | 'needs_password' | 'needs_registration';

// Verification token: HMAC-signed (phone + role + expiry)
const VERIFICATION_TTL_MS = 30 * 60 * 1000; // 30 dk

function sign(phone: string, role: Role, secret: string): string {
  const expiresAt = Date.now() + VERIFICATION_TTL_MS;
  const payload = `${phone}|${role}|${expiresAt}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function verify(token: string, phone: string, role: Role, secret: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [tokPhone, tokRole, expStr, sig] = decoded.split('|');
    if (tokPhone !== phone || tokRole !== role) return false;
    const expiresAt = Number(expStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${tokPhone}|${tokRole}|${expStr}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}

@Injectable()
export class AuthService {
  private readonly verificationSecret =
    process.env.AUTH_VERIFICATION_SECRET || process.env.JWT_SECRET || 'dev-verification-secret';

  constructor(
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').replace(/^90/, '').replace(/^([1-9])/, '0$1');
  }

  async phoneCheck(phone: string, role: Role): Promise<{ status: PhoneCheckStatus }> {
    const normalized = this.normalizePhone(phone);
    if (role === 'parent') {
      const p = await this.parents.findOne({
        where: [{ phone }, { phone: normalized }],
      });
      if (!p) return { status: 'needs_registration' };
      if (!p.passwordHash) return { status: 'needs_password' };
      return { status: 'has_password' };
    } else {
      const p = await this.providers.findOne({
        where: [{ phone }, { phone: normalized }],
      });
      if (!p) return { status: 'needs_registration' };
      if (!p.passwordHash) return { status: 'needs_password' };
      return { status: 'has_password' };
    }
  }

  async otpSend(phone: string, role: Role) {
    // Rate limiting + Netgsm send OtpService içinde
    return this.otp.send(phone, OTP_PURPOSE.AUTH_PHONE_VERIFY);
  }

  async otpVerify(phone: string, role: Role, code: string): Promise<{ verificationToken: string }> {
    await this.otp.verify(phone, OTP_PURPOSE.AUTH_PHONE_VERIFY, code);
    const verificationToken = sign(phone, role, this.verificationSecret);
    return { verificationToken };
  }

  async setPassword(
    phone: string,
    role: Role,
    verificationToken: string,
    password: string,
  ): Promise<{ token: string; role: Role; userId: string; name: string; status?: string }> {
    if (!verify(verificationToken, phone, role, this.verificationSecret)) {
      throw new UnauthorizedException('Doğrulama süresi doldu, tekrar SMS iste');
    }
    const normalized = this.normalizePhone(phone);
    const passwordHash = await argon2.hash(password);

    if (role === 'parent') {
      const p = await this.parents.findOne({
        where: [{ phone }, { phone: normalized }],
      });
      if (!p) throw new BadRequestException('Kullanıcı bulunamadı');
      p.passwordHash = passwordHash;
      await this.parents.save(p);
      const token = await this.jwt.signAsync({ sub: p.id, role: 'parent' });
      return { token, role: 'parent', userId: p.id, name: p.name };
    } else {
      const p = await this.providers.findOne({
        where: [{ phone }, { phone: normalized }],
      });
      if (!p) throw new BadRequestException('Servisçi hesabı bulunamadı');
      p.passwordHash = passwordHash;
      p.mustChangePassword = false;
      await this.providers.save(p);
      const token = await this.jwt.signAsync({ sub: p.id, role: 'provider' });
      return {
        token,
        role: 'provider',
        userId: p.id,
        name: p.companyName,
        status: p.status,
      };
    }
  }

  async registerParent(input: {
    phone: string;
    verificationToken: string;
    name: string;
    email?: string;
    password: string;
  }): Promise<{ token: string; role: 'parent'; userId: string; name: string }> {
    if (!verify(input.verificationToken, input.phone, 'parent', this.verificationSecret)) {
      throw new UnauthorizedException('Doğrulama süresi doldu, tekrar SMS iste');
    }
    const normalized = this.normalizePhone(input.phone);
    const existing = await this.parents.findOne({
      where: [{ phone: input.phone }, { phone: normalized }],
    });
    if (existing) {
      throw new ConflictException('Bu telefonda zaten hesap var');
    }
    const passwordHash = await argon2.hash(input.password);
    const parent = this.parents.create({
      phone: normalized,
      name: input.name,
      email: input.email ?? null,
      passwordHash,
    });
    const saved = await this.parents.save(parent);
    const token = await this.jwt.signAsync({ sub: saved.id, role: 'parent' });
    return { token, role: 'parent', userId: saved.id, name: saved.name };
  }

  async registerProvider(input: {
    phone: string;
    verificationToken: string;
    companyName: string;
    taxNo?: string;
    ownerName: string;
    email?: string;
    address?: string;
    password: string;
  }): Promise<{ token: string; role: 'provider'; userId: string; name: string; status: string }> {
    if (!verify(input.verificationToken, input.phone, 'provider', this.verificationSecret)) {
      throw new UnauthorizedException('Doğrulama süresi doldu, tekrar SMS iste');
    }
    const normalized = this.normalizePhone(input.phone);
    const existing = await this.providers.findOne({
      where: [{ phone: input.phone }, { phone: normalized }],
    });
    if (existing) {
      throw new ConflictException('Bu telefonda zaten servisçi hesabı var');
    }
    const passwordHash = await argon2.hash(input.password);
    const provider = this.providers.create({
      phone: normalized,
      companyName: input.companyName,
      taxNo: input.taxNo ?? null,
      ownerName: input.ownerName,
      email: input.email ?? null,
      address: input.address ?? null,
      status: 'pending_approval',
      passwordHash,
      mustChangePassword: false,
    });
    const saved = await this.providers.save(provider);
    const token = await this.jwt.signAsync({ sub: saved.id, role: 'provider' });
    return {
      token,
      role: 'provider',
      userId: saved.id,
      name: saved.companyName,
      status: saved.status,
    };
  }
}

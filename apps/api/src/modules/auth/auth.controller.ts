import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { AuthService } from './auth.service';

class PhoneCheckDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsIn(['parent', 'provider']) role!: 'parent' | 'provider';
}

class PhoneOtpSendDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsIn(['parent', 'provider']) role!: 'parent' | 'provider';
}

class PhoneOtpVerifyDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsIn(['parent', 'provider']) role!: 'parent' | 'provider';
  @IsString() @Matches(/^\d{6}$/) code!: string;
}

class ParentRegisterDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsString() verificationToken!: string;
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'Şifre 6 rakamdan oluşmalı' }) password!: string;
}

class ProviderRegisterDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsString() verificationToken!: string;
  @IsString() @Length(2, 200) companyName!: string;
  @IsOptional() @IsString() taxNo?: string;
  @IsString() @Length(2, 120) ownerName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'Şifre 6 rakamdan oluşmalı' }) password!: string;
}

class SetPasswordDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsIn(['parent', 'provider']) role!: 'parent' | 'provider';
  @IsString() verificationToken!: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'Şifre 6 rakamdan oluşmalı' }) password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  /**
   * Unified phone check — mobile bu tek endpoint'e telefon + rol atar,
   * hangi ekrana yönleneceğini backend söyler.
   * Response: { status: 'has_password' | 'needs_password' | 'needs_registration' }
   */
  @Post('phone-check')
  check(@Body() dto: PhoneCheckDto) {
    return this.svc.phoneCheck(dto.phone, dto.role);
  }

  /**
   * OTP gönder — hem 'needs_password' (mevcut hesaba şifre belirletme)
   * hem 'needs_registration' (yeni kayıt) akışlarında kullanılır.
   */
  @Post('otp/send')
  otpSend(@Body() dto: PhoneOtpSendDto) {
    return this.svc.otpSend(dto.phone, dto.role);
  }

  /**
   * OTP doğrula — verification token döner (30 dk geçerli).
   * Bu token register veya set-password endpoint'lerinde kullanılır.
   */
  @Post('otp/verify')
  otpVerify(@Body() dto: PhoneOtpVerifyDto) {
    return this.svc.otpVerify(dto.phone, dto.role, dto.code);
  }

  /**
   * Mevcut hesap için şifre belirle (OTP doğrulama sonrası)
   */
  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto) {
    return this.svc.setPassword(dto.phone, dto.role, dto.verificationToken, dto.password);
  }

  /**
   * Yeni veli hesabı oluştur — OTP verify token gerekli
   */
  @Post('register/parent')
  registerParent(@Body() dto: ParentRegisterDto) {
    return this.svc.registerParent({
      phone: dto.phone,
      verificationToken: dto.verificationToken,
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });
  }

  /**
   * Yeni servisçi hesabı oluştur — OTP verify token gerekli
   * status = 'pending_approval' olarak yaratılır (admin onayı bekler)
   */
  @Post('register/provider')
  registerProvider(@Body() dto: ProviderRegisterDto) {
    return this.svc.registerProvider({
      phone: dto.phone,
      verificationToken: dto.verificationToken,
      companyName: dto.companyName,
      taxNo: dto.taxNo,
      ownerName: dto.ownerName,
      email: dto.email,
      address: dto.address,
      password: dto.password,
    });
  }
}

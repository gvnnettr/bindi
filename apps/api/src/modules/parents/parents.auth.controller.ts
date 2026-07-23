import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { ParentsService } from './parents.service';

class CheckDto {
  @IsString() @Length(10, 20) phone!: string;
}
class LoginRequestDto {
  @IsString() @Length(10, 20) phone!: string;
}
class OtpLoginDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsString() @Matches(/^\d{6}$/) code!: string;
  @IsOptional() @IsString() @Length(6, 6) @Matches(/^\d{6}$/, { message: 'Şifre 6 rakamdan oluşmalı' }) newPassword?: string;
}
class PasswordLoginDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsString() @Length(1, 100) password!: string;
}

@Controller('parents')
export class ParentsAuthController {
  constructor(private readonly svc: ParentsService) {}

  @Post('login/check')
  check(@Body() dto: CheckDto) {
    return this.svc.check(dto.phone);
  }

  @Post('login/request')
  request(@Body() dto: LoginRequestDto) {
    return this.svc.loginRequest(dto.phone);
  }

  @Post('login/otp')
  loginOtp(@Body() dto: OtpLoginDto) {
    return this.svc.loginWithOtp(dto.phone, dto.code, dto.newPassword);
  }

  @Post('login/password')
  loginPassword(@Body() dto: PasswordLoginDto) {
    return this.svc.loginWithPassword(dto.phone, dto.password);
  }
}

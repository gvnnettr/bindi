import { Body, Controller, Post } from '@nestjs/common';
import { IsIn, IsString, Length, Matches } from 'class-validator';
import { OtpService } from './otp.service';
import { OTP_PURPOSE, OtpPurpose } from '@servis/shared';

const PURPOSES = Object.values(OTP_PURPOSE);

class SendOtpDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsIn(PURPOSES as string[]) purpose!: OtpPurpose;
}

class VerifyOtpDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsIn(PURPOSES as string[]) purpose!: OtpPurpose;
  @IsString() @Matches(/^\d{6}$/) code!: string;
}

@Controller('otp')
export class OtpController {
  constructor(private readonly svc: OtpService) {}

  @Post('send')
  send(@Body() dto: SendOtpDto) {
    return this.svc.send(dto.phone, dto.purpose);
  }

  @Post('verify')
  verify(@Body() dto: VerifyOtpDto) {
    return this.svc.verify(dto.phone, dto.purpose, dto.code);
  }
}

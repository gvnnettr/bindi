import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProvidersService } from './providers.service';
import { PACKAGE_CODES, PackageCode } from '@servis/shared';

class RegionInputDto {
  @IsString() city!: string;
  @IsString() district!: string;
  @IsOptional() @IsString() neighborhood?: string;
}

class DocumentInputDto {
  @IsUUID() definitionId!: string;
  @IsString() fileUrl!: string;
  @IsOptional() @IsString() originalName?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

class ProviderRegisterDto {
  @IsString() verificationToken!: string;
  @IsString() @Length(2, 200) companyName!: string;
  @IsOptional() @IsString() taxNo?: string;
  @IsString() @Length(2, 120) ownerName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;

  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) schoolIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegionInputDto)
  regions!: RegionInputDto[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(Object.values(PACKAGE_CODES) as string[], { each: true })
  packages!: PackageCode[];

  @IsOptional() @IsString() receiptUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentInputDto)
  documents?: DocumentInputDto[];
}

class LoginDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsString() @Length(1, 100) password!: string;
}

class ForgotDto {
  @IsString() @Length(10, 20) phone!: string;
}

class ResetDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsString() @Matches(/^\d{6}$/) code!: string;
  @IsString() @Length(6, 6) @Matches(/^\d{6}$/, { message: 'Şifre 6 rakamdan oluşmalı' }) newPassword!: string;
}

@Controller('providers')
export class ProvidersAuthController {
  constructor(private readonly svc: ProvidersService) {}

  @Post('register')
  register(@Body() dto: ProviderRegisterDto) {
    return this.svc.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.svc.login(dto.phone, dto.password);
  }

  @Post('forgot-password')
  forgot(@Body() dto: ForgotDto) {
    return this.svc.forgotPassword(dto.phone);
  }

  @Post('reset-password')
  reset(@Body() dto: ResetDto) {
    return this.svc.resetPassword(dto.phone, dto.code, dto.newPassword);
  }

  /**
   * Public: bir servisçinin yorumları (KVKK: veli ismi 'A.Y.' maskeli)
   * Veli teklif detay ekranında görüntüler
   */
  @Get(':id/reviews')
  publicReviews(@Param('id') providerId: string) {
    return this.svc.getPublicReviews(providerId);
  }
}

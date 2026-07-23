import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { EnrollmentsService } from './enrollments.service';
import {
  ProviderJwtStrategy,
  ProviderRequest,
} from '../providers/provider-jwt.strategy';

class UpdateDto {
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @IsOptional() @IsNumber() monthlyPrice?: number;
  @IsOptional() @IsUUID() vehicleId?: string | null;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}$/, { message: 'Format YYYY-MM olmalı' }) startMonth?: string;
}

class PaymentStatusDto {
  @IsIn(['paid', 'pending', 'cancelled']) status!: 'paid' | 'pending' | 'cancelled';
  @IsOptional() @IsString() @MaxLength(500) providerNote?: string;
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/enrollments')
export class EnrollmentsMeController {
  constructor(private readonly svc: EnrollmentsService) {}

  @Get()
  list(@Req() req: ProviderRequest) {
    return this.svc.listByProvider(req.provider.id);
  }

  @Get(':id')
  detail(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.detail(req.provider.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: ProviderRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDto,
  ) {
    return this.svc.update(req.provider.id, id, dto);
  }

  @Post(':id/end')
  end(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.end(req.provider.id, id);
  }
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/payments')
export class ProviderPaymentsController {
  constructor(private readonly svc: EnrollmentsService) {}

  @Get()
  list(@Req() req: ProviderRequest) {
    return this.svc.listAllPaymentsForProvider(req.provider.id);
  }

  @Get('report')
  report(@Req() req: ProviderRequest) {
    return this.svc.providerRevenueReport(req.provider.id);
  }

  @Patch(':id/status')
  setStatus(
    @Req() req: ProviderRequest,
    @Param('id') id: string,
    @Body() dto: PaymentStatusDto,
  ) {
    return this.svc.setPaymentStatusByProvider(req.provider.id, id, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { OffersService } from './offers.service';
import {
  ProviderJwtStrategy,
  ProviderRequest,
} from '../providers/provider-jwt.strategy';

class CreateOfferDto {
  @IsUUID() requestId!: string;
  @IsNumberString() monthlyPrice!: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsString() note?: string;
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/offers')
export class OffersProviderController {
  constructor(private readonly svc: OffersService) {}

  @Post()
  create(@Req() req: ProviderRequest, @Body() dto: CreateOfferDto) {
    return this.svc.create(req.provider.id, dto);
  }

  @Get()
  list(@Req() req: ProviderRequest) {
    return this.svc.listForProvider(req.provider.id);
  }
}

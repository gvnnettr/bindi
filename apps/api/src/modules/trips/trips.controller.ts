import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { TripsService } from './trips.service';
import { ProviderJwtStrategy, ProviderRequest } from '../providers/provider-jwt.strategy';
import { ParentJwtGuard, ParentRequest } from '../parents/parent-jwt.guard';

class StartTripDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) enrollmentIds!: string[];
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() @Length(1, 120) routeName?: string;
}

class LocationDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/trips')
export class ProviderTripsController {
  constructor(private readonly svc: TripsService) {}

  @Post('start')
  start(@Req() req: ProviderRequest, @Body() dto: StartTripDto) {
    return this.svc.start(req.provider.id, dto);
  }

  @Get('active')
  active(@Req() req: ProviderRequest) {
    return this.svc.getActiveTrip(req.provider.id);
  }

  @Post(':id/location')
  loc(@Req() req: ProviderRequest, @Param('id') id: string, @Body() dto: LocationDto) {
    return this.svc.updateLocation(req.provider.id, id, dto.lat, dto.lng);
  }

  @Post(':id/end')
  end(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.end(req.provider.id, id);
  }
}

@UseGuards(ParentJwtGuard)
@Controller('me/parent/trips')
export class ParentTripsController {
  constructor(private readonly svc: TripsService) {}

  @Get('active')
  active(@Req() req: ParentRequest) {
    return this.svc.getActiveTripsForParent(req.parent.id);
  }
}

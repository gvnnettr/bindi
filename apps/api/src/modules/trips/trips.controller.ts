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
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { TripsService } from './trips.service';
import { ProviderJwtStrategy, ProviderRequest } from '../providers/provider-jwt.strategy';
import { ParentJwtGuard, ParentRequest } from '../parents/parent-jwt.guard';

class StartTripDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) enrollmentIds!: string[];
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() @Length(1, 120) routeName?: string;
}

class StartByVehicleDto {
  @IsString() vehicleId!: string;
  @IsIn(['morning', 'evening']) session!: 'morning' | 'evening';
  @IsOptional() @IsString() @Length(1, 120) routeName?: string;
}

class LocationDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
}

class BoardDto {
  @IsString() enrollmentId!: string;
  @IsIn(['boarded', 'missed', 'pending']) status!: 'boarded' | 'missed' | 'pending';
}

class AssignVehicleDto {
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  vehicleId!: string | null;
}

class ReorderDto {
  @IsArray() @IsString({ each: true }) enrollmentIds!: string[];
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/trips')
export class ProviderTripsController {
  constructor(private readonly svc: TripsService) {}

  @Post('start')
  start(@Req() req: ProviderRequest, @Body() dto: StartTripDto) {
    return this.svc.start(req.provider.id, dto);
  }

  @Post('start-vehicle')
  startByVehicle(@Req() req: ProviderRequest, @Body() dto: StartByVehicleDto) {
    return this.svc.startByVehicle(req.provider.id, dto);
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

  @Post(':id/board')
  board(@Req() req: ProviderRequest, @Param('id') id: string, @Body() dto: BoardDto) {
    return this.svc.markBoarding(req.provider.id, id, dto);
  }
}

// Ayrı controller: araç öğrencileri + atama
@UseGuards(ProviderJwtStrategy)
@Controller('me/vehicles')
export class ProviderVehicleAssignController {
  constructor(private readonly svc: TripsService) {}

  @Get(':id/students')
  listStudents(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.listVehicleStudents(req.provider.id, id);
  }

  @Patch(':id/students-order')
  reorder(@Req() req: ProviderRequest, @Param('id') id: string, @Body() dto: ReorderDto) {
    return this.svc.reorderVehicleStudents(req.provider.id, id, dto.enrollmentIds);
  }
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/vehicle-pool')
export class ProviderEnrollmentAssignController {
  constructor(private readonly svc: TripsService) {}

  // Araca atanmamis aktif enrollment'lar
  @Get('unassigned')
  unassigned(@Req() req: ProviderRequest) {
    return this.svc.listUnassignedEnrollments(req.provider.id);
  }

  // Bir enrollment'i araca ata / araci kaldir
  @Patch('assign/:id')
  assign(@Req() req: ProviderRequest, @Param('id') id: string, @Body() dto: AssignVehicleDto) {
    return this.svc.assignEnrollmentToVehicle(req.provider.id, id, dto.vehicleId ?? null);
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

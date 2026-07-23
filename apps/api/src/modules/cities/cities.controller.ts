import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { CitiesService } from './cities.service';
import { AdminJwtGuard } from '../admin/admin-jwt.guard';

class AddCityDto {
  @IsString() @Length(2, 80) city!: string;
}

@Controller('cities')
export class CitiesPublicController {
  constructor(private readonly svc: CitiesService) {}

  @Get('public')
  listPublic() {
    return this.svc.listEnabled();
  }
}

@UseGuards(AdminJwtGuard)
@Controller('admin/cities')
export class CitiesAdminController {
  constructor(private readonly svc: CitiesService) {}

  @Get()
  list() {
    return this.svc.listAdmin();
  }

  @Post()
  add(@Body() dto: AddCityDto) {
    return this.svc.add(dto.city);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

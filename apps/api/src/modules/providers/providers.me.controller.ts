import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ProvidersService } from './providers.service';
import { ProviderJwtStrategy, ProviderRequest } from './provider-jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';

class VehicleDto {
  @IsString() @Length(1, 80) brand!: string;
  @IsString() @Length(1, 120) model!: string;
  @IsInt() @Min(1990) @Max(2100) year!: number;
  @IsString() @Length(2, 20) plate!: string;
  @IsInt() @Min(4) @Max(50) seats!: number;
  @IsOptional() @IsString() photoUrl?: string;
}

class VehicleUpdateDto {
  @IsOptional() @IsString() @Length(1, 80) brand?: string;
  @IsOptional() @IsString() @Length(1, 120) model?: string;
  @IsOptional() @IsInt() @Min(1990) @Max(2100) year?: number;
  @IsOptional() @IsString() @Length(2, 20) plate?: string;
  @IsOptional() @IsInt() @Min(4) @Max(50) seats?: number;
  @IsOptional() @IsString() photoUrl?: string;
}

class DocumentMetaDto {
  @IsString() definitionId!: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @Length(0, 500) note?: string;
}

const DOC_DIR =
  process.env.UPLOAD_DIR || '/var/www/servis-platform/apps/web/public/uploads';

class InfoUpdateDto {
  @IsOptional() @IsString() @Length(2, 200) companyName?: string;
  @IsOptional() @IsString() taxNo?: string;
  @IsOptional() @IsString() @Length(2, 120) ownerName?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
}
class ChangePasswordDto {
  @IsString() @Length(1, 100) currentPassword!: string;
  @IsString() @Length(6, 6) @Matches(/^\d{6}$/, { message: 'Şifre 6 rakamdan oluşmalı' }) newPassword!: string;
}
class SchoolAddDto {
  @IsString() schoolId!: string;
}
class RegionAddDto {
  @IsString() city!: string;
  @IsString() district!: string;
}
class LocationRegionAddDto {
  @IsString() @Length(1, 200) label!: string;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsInt() @Min(1) @Max(200) radiusKm!: number;
}

@UseGuards(ProviderJwtStrategy)
@Controller('me')
export class ProvidersMeController {
  constructor(
    private readonly svc: ProvidersService,
    private readonly notif: NotificationsService,
  ) {}

  @Get('notifications')
  listNotif(@Req() req: ProviderRequest) {
    return this.notif.list('provider', req.provider.id);
  }
  @Get('notifications/unread-count')
  async unreadNotif(@Req() req: ProviderRequest) {
    return { count: await this.notif.unreadCount('provider', req.provider.id) };
  }
  @Post('notifications/:id/read')
  readNotif(@Param('id') id: string) {
    return this.notif.markRead(id);
  }
  @Post('notifications/read-all')
  readAllNotif(@Req() req: ProviderRequest) {
    return this.notif.markAllRead('provider', req.provider.id);
  }

  @Get()
  me(@Req() req: ProviderRequest) {
    return this.svc.getById(req.provider.id);
  }

  @Get('dashboard')
  dashboard(@Req() req: ProviderRequest) {
    return this.svc.getDashboard(req.provider.id);
  }

  @Get('reviews/stats')
  reviewsStats(@Req() req: ProviderRequest) {
    return this.svc.getReviewsStats(req.provider.id);
  }

  @Get('earnings/report')
  earningsReport(@Req() req: ProviderRequest) {
    return this.svc.getEarningsReport(req.provider.id);
  }

  @Get('vehicles')
  listVehicles(@Req() req: ProviderRequest) {
    return this.svc.listVehicles(req.provider.id);
  }

  @Post('vehicles')
  addVehicle(@Req() req: ProviderRequest, @Body() dto: VehicleDto) {
    return this.svc.addVehicle(req.provider.id, dto);
  }

  @Patch('vehicles/:id')
  updateVehicle(
    @Req() req: ProviderRequest,
    @Param('id') id: string,
    @Body() dto: VehicleUpdateDto,
  ) {
    return this.svc.updateVehicle(req.provider.id, id, dto);
  }

  @Delete('vehicles/:id')
  deleteVehicle(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.deleteVehicle(req.provider.id, id);
  }

  @Get('vehicles/:id/documents')
  listDocs(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.listVehicleDocuments(req.provider.id, id);
  }

  @Post('vehicles/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(DOC_DIR, 'docs');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = (path.extname(file.originalname) || '.pdf').toLowerCase();
          const name = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/heic',
        ];
        if (!ok.includes(file.mimetype)) {
          cb(new BadRequestException('Sadece PDF/PNG/JPEG/WEBP kabul edilir'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async addDoc(
    @Req() req: ProviderRequest,
    @Param('id') vehicleId: string,
    @Body() meta: DocumentMetaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!meta.definitionId)
      throw new BadRequestException('Belge tanımı seçilmedi');
    return this.svc.addVehicleDocument(req.provider.id, vehicleId, {
      definitionId: meta.definitionId,
      fileUrl: `/uploads/docs/${file.filename}`,
      originalName: file.originalname,
      issuedAt: meta.issuedAt ? new Date(meta.issuedAt) : null,
      expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null,
      note: meta.note ?? null,
    });
  }

  @Delete('vehicles/:vid/documents/:did')
  deleteDoc(
    @Req() req: ProviderRequest,
    @Param('vid') vid: string,
    @Param('did') did: string,
  ) {
    return this.svc.deleteVehicleDocument(req.provider.id, vid, did);
  }

  @Get('documents')
  listMyCompanyDocs(@Req() req: ProviderRequest) {
    return this.svc.listMyCompanyDocuments(req.provider.id);
  }

  @Get('subscription/takip')
  async takipStatus(@Req() req: ProviderRequest) {
    return {
      active: await this.svc.hasActiveTakipSubscription(req.provider.id),
    };
  }

  @Post('subscription/takip/interest')
  requestTakip(@Req() req: ProviderRequest) {
    return this.svc.requestTakipSubscription(req.provider.id);
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(DOC_DIR, 'company-docs');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = (path.extname(file.originalname) || '.pdf').toLowerCase();
          const name = `cdoc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/heic',
        ];
        if (!ok.includes(file.mimetype)) {
          cb(
            new BadRequestException('Sadece PDF/PNG/JPEG/WEBP kabul edilir'),
            false,
          );
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadCompanyDoc(
    @Req() req: ProviderRequest,
    @Body() meta: { definitionId: string; issuedAt?: string; expiresAt?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!meta.definitionId)
      throw new BadRequestException('Belge tanımı seçilmedi');
    return this.svc.upsertCompanyDocument(req.provider.id, {
      definitionId: meta.definitionId,
      fileUrl: `/uploads/company-docs/${file.filename}`,
      originalName: file.originalname,
      issuedAt: meta.issuedAt ? new Date(meta.issuedAt) : null,
      expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null,
    });
  }

  @Patch()
  updateInfo(@Req() req: ProviderRequest, @Body() dto: InfoUpdateDto) {
    return this.svc.updateInfo(req.provider.id, dto);
  }

  @Post('password')
  changePassword(@Req() req: ProviderRequest, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(req.provider.id, dto.currentPassword, dto.newPassword);
  }

  @Get('schools')
  mySchools(@Req() req: ProviderRequest) {
    return this.svc.listMySchools(req.provider.id);
  }

  @Post('schools')
  addSchool(@Req() req: ProviderRequest, @Body() dto: SchoolAddDto) {
    return this.svc.addMySchool(req.provider.id, dto.schoolId);
  }

  @Delete('schools/:id')
  removeSchool(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.removeMySchool(req.provider.id, id);
  }

  @Get('regions')
  myRegions(@Req() req: ProviderRequest) {
    return this.svc.listMyRegions(req.provider.id);
  }

  @Post('regions')
  addRegion(@Req() req: ProviderRequest, @Body() dto: RegionAddDto) {
    return this.svc.addMyRegion(req.provider.id, dto.city, dto.district);
  }

  @Post('regions/location')
  addLocationRegion(@Req() req: ProviderRequest, @Body() dto: LocationRegionAddDto) {
    return this.svc.addMyLocationRegion(req.provider.id, dto);
  }

  @Delete('regions/:id')
  removeRegion(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.removeMyRegion(req.provider.id, id);
  }
}

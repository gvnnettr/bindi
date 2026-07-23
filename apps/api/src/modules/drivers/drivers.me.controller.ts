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
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DriversService } from './drivers.service';
import {
  ProviderJwtStrategy,
  ProviderRequest,
} from '../providers/provider-jwt.strategy';

const DOC_DIR =
  process.env.UPLOAD_DIR || '/var/www/servis-platform/apps/web/public/uploads';

class DriverCreateDto {
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Length(10, 20) phone!: string;
  @IsOptional() @IsString() tcNo?: string;
  @IsOptional() @IsString() licenseClass?: string;
  @IsOptional() @IsString() note?: string;
}

class DriverUpdateDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @Length(10, 20) phone?: string;
  @IsOptional() @IsString() tcNo?: string;
  @IsOptional() @IsString() licenseClass?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() note?: string;
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/drivers')
export class DriversMeController {
  constructor(private readonly svc: DriversService) {}

  @Get()
  list(@Req() req: ProviderRequest) {
    return this.svc.listMine(req.provider.id);
  }

  @Post()
  create(@Req() req: ProviderRequest, @Body() dto: DriverCreateDto) {
    return this.svc.create(req.provider.id, dto);
  }

  @Get(':id')
  detail(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.detail(req.provider.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: ProviderRequest,
    @Param('id') id: string,
    @Body() dto: DriverUpdateDto,
  ) {
    return this.svc.update(req.provider.id, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: ProviderRequest, @Param('id') id: string) {
    return this.svc.remove(req.provider.id, id);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(DOC_DIR, 'driver-docs');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = (path.extname(file.originalname) || '.pdf').toLowerCase();
          const name = `ddoc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
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
  async uploadDoc(
    @Req() req: ProviderRequest,
    @Param('id') id: string,
    @Body() meta: { definitionId: string; issuedAt?: string; expiresAt?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!meta.definitionId)
      throw new BadRequestException('Belge tanımı seçilmedi');
    return this.svc.upsertDocument(req.provider.id, id, {
      definitionId: meta.definitionId,
      fileUrl: `/uploads/driver-docs/${file.filename}`,
      originalName: file.originalname,
      issuedAt: meta.issuedAt ? new Date(meta.issuedAt) : null,
      expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null,
    });
  }

  @Delete(':id/documents/:docId')
  deleteDoc(
    @Req() req: ProviderRequest,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.svc.deleteDocument(req.provider.id, id, docId);
  }
}

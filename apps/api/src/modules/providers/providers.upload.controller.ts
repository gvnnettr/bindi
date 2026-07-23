import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || '/var/www/servis-platform/apps/web/public/uploads';

@Controller('providers')
export class ProvidersUploadController {
  @Post('upload/document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(UPLOAD_DIR, 'company-docs');
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
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    return {
      ok: true,
      fileUrl: `/uploads/company-docs/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    };
  }
}

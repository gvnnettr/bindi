import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { EnrollmentsService } from './enrollments.service';
import {
  ParentJwtGuard,
  ParentRequest,
} from '../parents/parent-jwt.guard';

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || '/var/www/servis-platform/apps/web/public/uploads';

class ReceiptDto {
  @IsOptional() @IsString() @MaxLength(500) parentNote?: string;
}

@UseGuards(ParentJwtGuard)
@Controller('parent/payments')
export class ParentPaymentsController {
  constructor(private readonly svc: EnrollmentsService) {}

  @Get()
  list(@Req() req: ParentRequest) {
    return this.svc.listForParent(req.parent.id);
  }

  @Post(':id/receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(UPLOAD_DIR, 'receipts');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = (path.extname(file.originalname) || '.pdf').toLowerCase();
          const name = `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
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
  async submitReceipt(
    @Req() req: ParentRequest,
    @Param('id') paymentId: string,
    @Body() dto: ReceiptDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Dekont dosyası bulunamadı');
    return this.svc.submitReceiptByParent(req.parent.id, paymentId, {
      receiptUrl: `/uploads/receipts/${file.filename}`,
      parentNote: dto.parentNote,
    });
  }
}

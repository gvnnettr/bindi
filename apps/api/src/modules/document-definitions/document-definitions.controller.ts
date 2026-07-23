import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentDefinition } from '@servis/db';
import { AdminJwtGuard } from '../admin/admin-jwt.guard';

class DefCreateDto {
  @IsString() @Length(2, 60) code!: string;
  @IsString() @Length(2, 200) name!: string;
  @IsIn(['vehicle', 'company', 'driver']) scope!: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() requiresExpiry?: boolean;
  @IsOptional() @IsString() description?: string;
}

class DefUpdateDto {
  @IsOptional() @IsString() @Length(2, 200) name?: string;
  @IsOptional() @IsIn(['vehicle', 'company', 'driver']) scope?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() requiresExpiry?: boolean;
  @IsOptional() @IsString() description?: string;
}

@UseGuards(AdminJwtGuard)
@Controller('admin/document-definitions')
export class DocumentDefinitionsController {
  constructor(
    @InjectRepository(DocumentDefinition)
    private readonly repo: Repository<DocumentDefinition>,
  ) {}

  @Get()
  async list() {
    return this.repo.find({ order: { scope: 'ASC', sortOrder: 'ASC' } });
  }

  @Post()
  async create(@Body() dto: DefCreateDto) {
    const exists = await this.repo.findOne({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('Bu kod zaten kayıtlı');
    const d = this.repo.create({ ...dto } as any);
    await this.repo.save(d);
    return d;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: DefUpdateDto) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new BadRequestException('Bulunamadı');
    Object.assign(d, dto);
    await this.repo.save(d);
    return d;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new BadRequestException('Bulunamadı');
    d.active = false;
    await this.repo.save(d);
    return { ok: true, deactivated: true };
  }
}

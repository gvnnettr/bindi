import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestsService } from './requests.service';
import { PICKUP_TYPE, PickupType } from '@servis/shared';

class RequestStudentDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsString() class?: string;
  @IsString() schoolId!: string;
}

class CreateRequestDto {
  @IsString() verificationToken!: string;
  @IsString() @Length(2, 120) parentName!: string;
  @IsOptional() @IsEmail() parentEmail?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequestStudentDto)
  students!: RequestStudentDto[];

  @IsString() city!: string;
  @IsString() district!: string;
  @IsString() neighborhood!: string;
  @IsString() @Length(5, 300) address!: string;

  @IsIn(Object.values(PICKUP_TYPE) as string[])
  pickupType!: PickupType;

  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

@Controller('requests')
export class RequestsController {
  constructor(private readonly svc: RequestsService) {}

  @Post()
  create(@Body() dto: CreateRequestDto) {
    return this.svc.create(dto);
  }

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.svc.getByMagicToken(token);
  }
}

import {
  Body,
  Controller,
  Delete,
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
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ParentsService } from './parents.service';
import { ParentJwtGuard, ParentRequest } from './parent-jwt.guard';
import { GUARDIAN_RELATIONS, PICKUP_TYPE } from '@servis/shared';
import { NotificationsService } from '../notifications/notifications.service';

class SetPasswordDto {
  @IsString() @Length(6, 6) @Matches(/^\d{6}$/, { message: 'Şifre 6 rakamdan oluşmalı' }) password!: string;
}
class UpdateInfoDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() email?: string;
}
class RequestPhoneDto {
  @IsString() @Length(10, 20) newPhone!: string;
}
class VerifyPhoneDto {
  @IsString() @Length(10, 20) newPhone!: string;
  @IsString() @Length(6, 6) code!: string;
}
class ReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @Length(0, 500) comment?: string;
}
class AddStudentDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsString() class?: string;
  @IsString() schoolId!: string;
}
class UpdateStudentDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsString() class?: string;
  @IsOptional() @IsString() schoolId?: string;
}
class CreateRequestDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) studentIds!: string[];
  @IsString() city!: string;
  @IsString() district!: string;
  @IsString() neighborhood!: string;
  @IsString() @Length(5, 300) address!: string;
  @IsIn(Object.values(PICKUP_TYPE) as string[]) pickupType!: 'both' | 'morning_only' | 'afternoon_only';
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}
class InviteGuardianDto {
  @IsString() @Length(10, 20) phone!: string;
  @IsString() @Length(1, 120) name!: string;
  @IsIn(GUARDIAN_RELATIONS as any) relation!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) studentIds!: string[];
}

@UseGuards(ParentJwtGuard)
@Controller('me/parent')
export class ParentsMeController {
  constructor(
    private readonly svc: ParentsService,
    private readonly notif: NotificationsService,
  ) {}

  @Get('notifications')
  listNotif(@Req() req: ParentRequest) {
    return this.notif.list('parent', req.parent.id);
  }
  @Get('notifications/unread-count')
  async unreadNotif(@Req() req: ParentRequest) {
    return { count: await this.notif.unreadCount('parent', req.parent.id) };
  }
  @Post('notifications/:id/read')
  readNotif(@Param('id') id: string) {
    return this.notif.markRead(id);
  }
  @Post('notifications/read-all')
  readAllNotif(@Req() req: ParentRequest) {
    return this.notif.markAllRead('parent', req.parent.id);
  }

  @Get()
  me(@Req() req: ParentRequest) {
    return this.svc.me(req.parent.id);
  }

  @Post('password')
  setPassword(@Req() req: ParentRequest, @Body() dto: SetPasswordDto) {
    return this.svc.setPassword(req.parent.id, dto.password);
  }

  @Patch()
  updateInfo(@Req() req: ParentRequest, @Body() dto: UpdateInfoDto) {
    return this.svc.updateInfo(req.parent.id, dto);
  }

  @Post('phone/request')
  reqPhone(@Req() req: ParentRequest, @Body() dto: RequestPhoneDto) {
    return this.svc.requestPhoneChange(req.parent.id, dto.newPhone);
  }

  @Post('phone/verify')
  verPhone(@Req() req: ParentRequest, @Body() dto: VerifyPhoneDto) {
    return this.svc.verifyPhoneChange(req.parent.id, dto.newPhone, dto.code);
  }

  // Talepler
  @Get('requests')
  listRequests(@Req() req: ParentRequest) {
    return this.svc.listRequests(req.parent.id);
  }

  @Post('requests')
  createRequest(@Req() req: ParentRequest, @Body() dto: CreateRequestDto) {
    return this.svc.createRequestFromPanel(req.parent.id, dto);
  }

  @Post('requests/:id/cancel')
  cancel(@Req() req: ParentRequest, @Param('id') id: string) {
    return this.svc.cancelRequest(req.parent.id, id);
  }

  @Post('requests/:id/unselect')
  unselect(@Req() req: ParentRequest, @Param('id') id: string) {
    return this.svc.unselectRequest(req.parent.id, id);
  }

  // Öğrenciler
  @Get('students')
  listStudents(@Req() req: ParentRequest) {
    return this.svc.listStudents(req.parent.id);
  }

  @Post('students')
  addStudent(@Req() req: ParentRequest, @Body() dto: AddStudentDto) {
    return this.svc.addStudent(req.parent.id, dto);
  }

  @Patch('students/:id')
  updateStudent(
    @Req() req: ParentRequest,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.svc.updateStudent(req.parent.id, id, dto);
  }

  @Delete('students/:id')
  removeStudent(@Req() req: ParentRequest, @Param('id') id: string) {
    return this.svc.removeStudent(req.parent.id, id);
  }

  // Guardians (aile üyeleri)
  @Get('guardians')
  listGuardians(@Req() req: ParentRequest) {
    return this.svc.listGuardiansForParent(req.parent.id);
  }

  @Post('guardians')
  inviteGuardian(@Req() req: ParentRequest, @Body() dto: InviteGuardianDto) {
    return this.svc.inviteGuardian(req.parent.id, dto);
  }

  @Delete('guardians/:id')
  removeGuardian(@Req() req: ParentRequest, @Param('id') id: string) {
    return this.svc.removeGuardian(req.parent.id, id);
  }

  // Puanlama
  @Post('offers/:offerId/review')
  review(
    @Req() req: ParentRequest,
    @Param('offerId') offerId: string,
    @Body() dto: ReviewDto,
  ) {
    return this.svc.reviewOffer(req.parent.id, offerId, dto.rating, dto.comment);
  }
}

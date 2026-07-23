import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsIn,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { AdminService } from './admin.service';
import { AdminJwtGuard, AdminRequest } from './admin-jwt.guard';
import { NotificationsService } from '../notifications/notifications.service';

class SchoolCreateDto {
  @IsString() name!: string;
  @IsString() city!: string;
  @IsString() district!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}
class SchoolUpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}
class ApproveDto {
  @IsInt() @Min(1) @Max(60) months!: number;
}
class PackagePriceDto {
  @IsNumberString() monthlyPrice!: string;
}
class AdminCreateDto {
  @IsEmail() email!: string;
  @IsString() @Length(6, 100) password!: string;
  @IsOptional() @IsIn(['admin', 'super_admin']) role?: string;
}
class AdminUpdateDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(6, 100) password?: string;
  @IsOptional() @IsIn(['admin', 'super_admin']) role?: string;
}

@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly svc: AdminService,
    private readonly notif: NotificationsService,
  ) {}

  @Get('notifications')
  listNotif() {
    return this.notif.list('admin', null);
  }
  @Get('notifications/unread-count')
  async unreadNotif() {
    return { count: await this.notif.unreadCount('admin', null) };
  }
  @Post('notifications/:id/read')
  readNotif(@Param('id') id: string) {
    return this.notif.markRead(id);
  }
  @Post('notifications/read-all')
  readAllNotif() {
    return this.notif.markAllRead('admin', null);
  }

  @Get('dashboard')
  dashboard() {
    return this.svc.dashboard();
  }

  @Get('dashboard-full')
  dashboardFull() {
    return this.svc.dashboardFull();
  }

  @Get('search-users')
  searchUsers(
    @Query('role') role: 'parent' | 'provider',
    @Query('q') q: string,
  ) {
    return this.svc.searchUsers(role, q ?? '');
  }

  @Post('broadcast')
  broadcast(
    @Body()
    dto: {
      role: 'parent' | 'provider' | 'admin';
      recipientId?: string | null;
      title: string;
      body?: string;
      link?: string;
    },
  ) {
    return this.svc.broadcast(dto);
  }

  @Get('providers/pending')
  pending() {
    return this.svc.listPendingProviders();
  }

  @Get('providers')
  all() {
    return this.svc.listAllProviders();
  }

  @Post('providers/:id/approve')
  approve(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ApproveDto,
  ) {
    return this.svc.approveProvider(id, dto.months, req.admin.id);
  }

  @Get('users')
  listAdmins() {
    return this.svc.listAdmins();
  }

  @Post('users')
  createAdmin(@Body() dto: AdminCreateDto) {
    return this.svc.createAdmin(dto);
  }

  @Patch('users/:id')
  updateAdmin(@Param('id') id: string, @Body() dto: AdminUpdateDto) {
    return this.svc.updateAdmin(id, dto);
  }

  @Delete('users/:id')
  deleteAdmin(@Param('id') id: string, @Req() req: AdminRequest) {
    return this.svc.deleteAdmin(id, req.admin.id);
  }

  @Get('providers/:id')
  providerDetail(@Param('id') id: string) {
    return this.svc.providerDetail(id);
  }

  @Get('providers/:id/documents')
  providerDocuments(@Param('id') id: string) {
    return this.svc.listProviderDocuments(id);
  }

  @Get('expiring-documents')
  expiringDocuments(@Query('days') days?: string) {
    return this.svc.listExpiringDocuments(days ? Number(days) : 30);
  }

  @Get('activity-log')
  activityLog(@Query('limit') limit?: string) {
    return this.svc.listActivityLog(limit ? Number(limit) : 100);
  }

  @Get('providers/:id/vehicle-documents')
  providerVehicleDocuments(@Param('id') id: string) {
    return this.svc.listProviderVehicleDocuments(id);
  }

  @Get('providers/:id/drivers')
  providerDrivers(@Param('id') id: string) {
    return this.svc.listProviderDrivers(id);
  }

  @Post('vehicle-documents/:docId/review')
  reviewVehicleDoc(
    @Req() req: AdminRequest,
    @Param('docId') docId: string,
    @Body() dto: { decision: 'approved' | 'rejected'; rejectionReason?: string },
  ) {
    return this.svc.reviewVehicleDocument(
      docId,
      dto.decision,
      dto.rejectionReason ?? null,
      req.admin.id,
    );
  }

  @Post('driver-documents/:docId/review')
  reviewDriverDoc(
    @Req() req: AdminRequest,
    @Param('docId') docId: string,
    @Body() dto: { decision: 'approved' | 'rejected'; rejectionReason?: string },
  ) {
    return this.svc.reviewDriverDocument(
      docId,
      dto.decision,
      dto.rejectionReason ?? null,
      req.admin.id,
    );
  }

  @Post('providers/:id/documents/:docId/review')
  reviewDoc(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() dto: { decision: 'approved' | 'rejected'; rejectionReason?: string },
  ) {
    return this.svc.reviewProviderDocument(
      id,
      docId,
      dto.decision,
      dto.rejectionReason ?? null,
      req.admin.id,
    );
  }

  @Post('providers/:id/finalize-review')
  finalizeReview(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: { months?: number },
  ) {
    return this.svc.finalizeProviderReview(id, dto.months ?? 12, req.admin.id);
  }

  @Post('providers/:id/schools')
  setSchools(@Param('id') id: string, @Body() dto: { schoolIds: string[] }) {
    return this.svc.setProviderSchools(id, dto.schoolIds ?? []);
  }

  @Post('providers/:id/regions')
  setRegions(
    @Param('id') id: string,
    @Body()
    dto: {
      regions: Array<{ city: string; district: string; neighborhood?: string }>;
    },
  ) {
    return this.svc.setProviderRegions(id, dto.regions ?? []);
  }

  @Patch('providers/:id')
  updateProviderInfo(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      companyName: string;
      taxNo: string;
      ownerName: string;
      email: string;
      address: string;
    }>,
  ) {
    return this.svc.updateProvider(id, dto);
  }

  @Patch('providers/:id/status')
  updateProviderStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.svc.updateProviderStatus(id, dto.status);
  }

  @Patch('providers/:id/subscriptions/:sid')
  updateProviderSub(
    @Param('id') id: string,
    @Param('sid') sid: string,
    @Body() dto: { startsAt?: string; endsAt?: string; approve?: boolean },
  ) {
    return this.svc.updateProviderSubscription(id, sid, dto);
  }

  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) {
    return this.svc.deleteProvider(id);
  }

  @Get('schools')
  schools() {
    return this.svc.listSchools();
  }

  @Post('schools')
  createSchool(@Body() dto: SchoolCreateDto) {
    return this.svc.createSchool(dto);
  }

  @Patch('schools/:id')
  updateSchool(@Param('id') id: string, @Body() dto: SchoolUpdateDto) {
    return this.svc.updateSchool(id, dto);
  }

  @Delete('schools/:id')
  deleteSchool(@Param('id') id: string) {
    return this.svc.deleteSchool(id);
  }

  @Get('packages')
  packages() {
    return this.svc.listPackages();
  }

  @Patch('packages/:code')
  updatePackage(@Param('code') code: string, @Body() dto: PackagePriceDto) {
    return this.svc.updatePackagePrice(code, dto.monthlyPrice);
  }

  @Get('requests')
  requests() {
    return this.svc.listRequests();
  }

  @Get('requests/:id')
  requestDetail(@Param('id') id: string) {
    return this.svc.requestDetail(id);
  }
}

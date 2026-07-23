import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { PushService } from './push.service';
import {
  ProviderJwtStrategy,
  ProviderRequest,
} from '../providers/provider-jwt.strategy';
import { ParentJwtGuard, ParentRequest } from '../parents/parent-jwt.guard';
import { AdminJwtGuard, AdminRequest } from '../admin/admin-jwt.guard';

class SubscribeDto {
  @IsString() endpoint!: string;
  @IsObject() keys!: { p256dh: string; auth: string };
  @IsOptional() @IsString() userAgent?: string;
}

class UnsubscribeDto {
  @IsString() endpoint!: string;
}

class MobileTokenDto {
  @IsString() token!: string;
  @IsIn(['ios', 'android']) platform!: 'ios' | 'android';
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() appVersion?: string;
}

class MobileUnregisterDto {
  @IsString() token!: string;
}

class TestPushDto {
  @IsIn(['provider', 'parent', 'admin'])
  role!: 'provider' | 'parent' | 'admin';
  @IsOptional() @IsString() recipientId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
}

@Controller('push')
export class PushPublicController {
  constructor(private readonly svc: PushService) {}

  @Get('vapid-key')
  vapidKey() {
    return { publicKey: this.svc.publicKey() };
  }
}

@UseGuards(ProviderJwtStrategy)
@Controller('me/push')
export class ProviderPushController {
  constructor(private readonly svc: PushService) {}

  @Post('subscribe')
  subscribe(@Req() req: ProviderRequest, @Body() dto: SubscribeDto) {
    return this.svc.subscribe('provider', req.provider.id, dto);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.svc.unsubscribe(dto.endpoint);
  }

  @Post('mobile/register')
  registerMobile(@Req() req: ProviderRequest, @Body() dto: MobileTokenDto) {
    return this.svc.registerMobileToken('provider', req.provider.id, dto);
  }

  @Post('mobile/unregister')
  unregisterMobile(@Body() dto: MobileUnregisterDto) {
    return this.svc.unregisterMobileToken(dto.token);
  }
}

@UseGuards(ParentJwtGuard)
@Controller('parent/push')
export class ParentPushController {
  constructor(private readonly svc: PushService) {}

  @Post('subscribe')
  subscribe(@Req() req: ParentRequest, @Body() dto: SubscribeDto) {
    return this.svc.subscribe('parent', req.parent.id, dto);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.svc.unsubscribe(dto.endpoint);
  }

  @Post('mobile/register')
  registerMobile(@Req() req: ParentRequest, @Body() dto: MobileTokenDto) {
    return this.svc.registerMobileToken('parent', req.parent.id, dto);
  }

  @Post('mobile/unregister')
  unregisterMobile(@Body() dto: MobileUnregisterDto) {
    return this.svc.unregisterMobileToken(dto.token);
  }
}

@UseGuards(AdminJwtGuard)
@Controller('admin/push')
export class AdminPushController {
  constructor(private readonly svc: PushService) {}

  @Post('subscribe')
  subscribe(@Req() req: AdminRequest, @Body() dto: SubscribeDto) {
    return this.svc.subscribe('admin', req.admin.id, dto);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.svc.unsubscribe(dto.endpoint);
  }

  @Post('test')
  async test(@Body() dto: TestPushDto) {
    await this.svc.sendToRecipient(dto.role, dto.recipientId ?? null, {
      title: dto.title ?? 'Bindi Test',
      body:
        dto.body ??
        'Bu bir test bildirimidir. Alıyorsan mobil push kurulumu çalışıyor.',
      data: { source: 'admin-test' },
    });
    return { ok: true };
  }
}

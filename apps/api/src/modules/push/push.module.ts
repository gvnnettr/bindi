import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MobilePushToken, PushSubscription } from '@servis/db';
import { PushService } from './push.service';
import {
  PushPublicController,
  ProviderPushController,
  ParentPushController,
  AdminPushController,
} from './push.controller';
import { ProvidersModule } from '../providers/providers.module';
import { ParentsModule } from '../parents/parents.module';
import { AdminModule } from '../admin/admin.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription, MobilePushToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
    ProvidersModule,
    ParentsModule,
    AdminModule,
  ],
  controllers: [
    PushPublicController,
    ProviderPushController,
    ParentPushController,
    AdminPushController,
  ],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}

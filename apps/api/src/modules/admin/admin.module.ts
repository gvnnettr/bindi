import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminUser } from '@servis/db';
import { Provider } from '@servis/db';
import { ProviderSubscription } from '@servis/db';
import { School } from '@servis/db';
import { PackageEntity } from '@servis/db';
import { ServiceRequest, Offer, Parent, Review } from '@servis/db';
import {
  ProviderDocument,
  DocumentDefinition,
  ProviderSchool,
  ProviderRegion,
  Vehicle,
  VehicleDocument,
  Driver,
  DriverDocument,
  AdminActivityLog,
} from '@servis/db';
import { AdminAuthController } from './admin.auth.controller';
import { AdminController } from './admin.controller';
import { AdminSettingsController } from './admin.settings.controller';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './admin-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      Provider,
      ProviderSubscription,
      School,
      PackageEntity,
      ServiceRequest,
      Offer,
      Parent,
      Review,
      ProviderDocument,
      DocumentDefinition,
      ProviderSchool,
      ProviderRegion,
      Vehicle,
      VehicleDocument,
      Driver,
      DriverDocument,
      AdminActivityLog,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AdminAuthController, AdminController, AdminSettingsController],
  providers: [AdminService, AdminJwtGuard],
  exports: [AdminService],
})
export class AdminModule {}

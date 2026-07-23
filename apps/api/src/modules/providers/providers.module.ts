import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@servis/db';
import { ProviderSchool } from '@servis/db';
import { ProviderRegion } from '@servis/db';
import { ProviderSubscription } from '@servis/db';
import { PackageEntity } from '@servis/db';
import { Vehicle } from '@servis/db';
import { VehicleDocument } from '@servis/db';
import { ProviderDocument, DocumentDefinition } from '@servis/db';
import { School } from '@servis/db';
import { OtpModule } from '../otp/otp.module';
import { ProvidersService } from './providers.service';
import { ProvidersAuthController } from './providers.auth.controller';
import { ProvidersMeController } from './providers.me.controller';
import { ProvidersUploadController } from './providers.upload.controller';
import { ProviderJwtStrategy } from './provider-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      ProviderSchool,
      ProviderRegion,
      ProviderSubscription,
      PackageEntity,
      Vehicle,
      VehicleDocument,
      ProviderDocument,
      DocumentDefinition,
      School,
    ]),
    OtpModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [
    ProvidersAuthController,
    ProvidersMeController,
    ProvidersUploadController,
  ],
  providers: [ProvidersService, ProviderJwtStrategy],
  exports: [ProvidersService],
})
export class ProvidersModule {}

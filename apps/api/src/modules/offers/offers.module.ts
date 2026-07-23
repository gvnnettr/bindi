import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Offer } from '@servis/db';
import { ServiceRequest } from '@servis/db';
import { Provider } from '@servis/db';
import { Vehicle } from '@servis/db';
import { ProviderDocument, DocumentDefinition } from '@servis/db';
import { OffersService } from './offers.service';
import { OffersProviderController } from './offers.provider.controller';
import { OffersPublicController } from './offers.public.controller';
import { ProvidersModule } from '../providers/providers.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Offer,
      ServiceRequest,
      Provider,
      Vehicle,
      ProviderDocument,
      DocumentDefinition,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
    ProvidersModule,
    EnrollmentsModule,
  ],
  controllers: [OffersProviderController, OffersPublicController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}

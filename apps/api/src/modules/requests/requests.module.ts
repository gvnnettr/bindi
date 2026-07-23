import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from '@servis/db';
import { Student } from '@servis/db';
import { ServiceRequest } from '@servis/db';
import { RequestStudent } from '@servis/db';
import { Provider } from '@servis/db';
import { ProviderSchool } from '@servis/db';
import { ProviderRegion } from '@servis/db';
import { ProviderSubscription } from '@servis/db';
import { School } from '@servis/db';
import { Offer } from '@servis/db';
import { ProviderDismissal } from '@servis/db';
import { RequestsController } from './requests.controller';
import { RequestsProviderController } from './requests.provider.controller';
import { RequestsService } from './requests.service';
import { MatchingService } from './matching.service';
import { OtpModule } from '../otp/otp.module';
import { ProvidersModule } from '../providers/providers.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parent,
      Student,
      ServiceRequest,
      RequestStudent,
      Provider,
      ProviderSchool,
      ProviderRegion,
      ProviderSubscription,
      School,
      Offer,
      ProviderDismissal,
    ]),
    OtpModule,
    ProvidersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
  ],
  controllers: [RequestsController, RequestsProviderController],
  providers: [RequestsService, MatchingService],
  exports: [RequestsService, MatchingService],
})
export class RequestsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Trip, TripEnrollment, Enrollment, StudentGuardian } from '@servis/db';
import { TripsService } from './trips.service';
import { ProviderTripsController, ParentTripsController } from './trips.controller';
import { ProvidersModule } from '../providers/providers.module';
import { ParentsModule } from '../parents/parents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripEnrollment, Enrollment, StudentGuardian]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
    ProvidersModule,
    ParentsModule,
  ],
  controllers: [ProviderTripsController, ParentTripsController],
  providers: [TripsService],
})
export class TripsModule {}
